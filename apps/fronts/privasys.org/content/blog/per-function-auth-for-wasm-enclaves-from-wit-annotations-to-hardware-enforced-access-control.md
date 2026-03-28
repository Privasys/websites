---
title: "Per-Function Auth for WASM Enclaves: From WIT Annotations to Hardware-Enforced Access Control"
author: "B Foing"
date: "2026-03-28"
---

In our [last post](/blog/fido2-for-attested-enclaves-two-way-trust-between-your-phone-and-the-cloud) we introduced Privasys Wallet, a mobile authenticator that verifies enclave attestation before your private key is ever used. And before that, we showed how [WIT types flow from a deployed binary to MCP tool manifests](/blog/from-wit-to-mcp-how-wasm-enclaves-become-attested-tool-servers), turning every enclave into an attested tool server.

But we left a question unanswered: once a user is authenticated, who decides what they can do?

Today we are shipping **per-function authorisation for WASM applications**, declared directly in WIT and enforced by the enclave runtime. No external authorisation server. No sidecar policy engine. You annotate your WIT exports, and the enclave enforces the rules at the hardware boundary.

## The Problem with Bolt-On Authorisation

Authorisation in cloud applications is almost always an afterthought. You write your business logic, deploy it, and then bolt on an authorisation layer: an API gateway with route-based rules, an OPA sidecar, a middleware that checks JWTs and extracts scopes. The policy lives somewhere separate from the code it protects. It is configured by someone who may not have written the code. It drifts.

Inside an enclave, this pattern is worse than inconvenient. It is architecturally wrong.

The entire value proposition of a TEE is that the code and data inside it are protected from everything outside it, including the host, the cloud provider, and the infrastructure. If your authorisation policy is evaluated by a sidecar running outside the enclave, you have moved the trust boundary to the wrong place. The sidecar can be tampered with. The config can be swapped. The enclave has no way to verify that the authorisation decision it receives is genuine.

Authorisation for enclave workloads must happen inside the enclave. And it should be declared alongside the code, not in a separate system.

## `@auth`: Authorisation as a WIT Annotation

WIT already supports `///` doc comments on exports and parameters. We showed in our [MCP article](/blog/from-wit-to-mcp-how-wasm-enclaves-become-attested-tool-servers) how these comments become tool descriptions for AI agents. Now we are extending the same mechanism with `@auth` annotations that declare per-function access policy:

```wit
package privasys:medical@0.1.0;

/// @default-auth authenticated
world diagnostic {
    import privasys:enclave-os/auth@0.1.0;

    /// Analyse patient symptoms and return ranked diagnoses.
    /// @auth authenticated
    export analyse: func(
        symptoms: string,
        age: u32,
        allergies: list<string>,
    ) -> result<list<diagnosis>, error-code>;

    /// Return anonymised, aggregate statistics. Safe for public dashboards.
    /// @auth public
    export statistics: func() -> string;

    /// Manage patient data retention. Restricted to compliance officers.
    /// @auth role(compliance-officer)
    export purge-records: func(patient-id: string) -> result<string, string>;
}
```

Three policy levels:

- **`@auth public`** — no authentication required. Anyone who can reach the enclave can call this function.
- **`@auth authenticated`** — the caller must present a valid FIDO2 session token or OIDC JWT. Identity is verified, but no specific role is required.
- **`@auth role(compliance-officer)`** — the caller must be authenticated *and* hold at least one of the listed roles. Multiple roles are comma-separated: `@auth role(admin, compliance-officer)`.

The `@default-auth` annotation at the world level sets the policy for any export that does not have an explicit `@auth`. If neither is present, functions default to `public`.

This is not a convention. It is not a linter rule. It is an authorisation contract that the enclave runtime enforces before your function is ever called.

## How Annotations Become Runtime Policy

WIT annotations need to survive the build pipeline and reach the enclave runtime. Here is how they flow:

```
Developer writes WIT        Build pipeline              Enclave runtime
    │                            │                           │
    │  /// @auth role(admin)     │                           │
    │  export purge: func(...)   │                           │
    │                            │                           │
    ├────────────────────────────►  inject-wit-docs.py       │
    │                            │  parses /// comments      │
    │                            │  emits:                   │
    │                            │    "purge" → "Manage..."  │
    │                            │    "auth:purge" → "role(admin)"
    │                            │                           │
    │                            │  Appended as              │
    │                            │  package-docs section     │
    │                            ├──────────────────────────►│
    │                            │                           │
    │                            │  wasm_load delivers       │  merge_auth_from_docs()
    │                            │  compiled binary + docs   │  extracts auth:* keys
    │                            │                           │  builds AppPermissions
    │                            │                           │  → per-function policy map
```

1. **Build time.** Our reproducible app builder runs `inject-wit-docs.py`, which parses `///` comments from your WIT source. Doc comments become MCP tool descriptions. `@auth` lines become `auth:<function-name>` entries in a flat JSON map. Both are embedded in the WASM binary as a `package-docs` custom section.

2. **Deploy time.** When the platform delivers your application to the enclave via `wasm_load`, the docs travel alongside the compiled binary. The runtime calls `merge_auth_from_docs()`, which extracts every `auth:*` key and builds the per-function permission map.

3. **Call time.** When a request arrives for a specific function, `check_app_permissions()` looks up the effective policy (function-specific override or default), verifies the caller's token if required, and either allows the call or returns an error describing what authentication is needed.

The beauty of this design is that `@auth` annotations are *code*. They live in your WIT file, next to your function signatures. They go through the same code review process. They are hashed into the `APP_CONFIGURATION_HASH_OID` that appears in the enclave's RA-TLS certificate. A remote verifier can confirm not just what code is running, but what authorisation policy governs it.

## Two Auth Paths, One Policy

The enclave accepts two kinds of authentication tokens, and both are checked against the same per-function policy:

### FIDO2 Session Tokens

If you have read our [Privasys Wallet announcement](/blog/fido2-for-attested-enclaves-two-way-trust-between-your-phone-and-the-cloud), you know the flow: the wallet verifies the enclave's attestation, then completes a FIDO2 ceremony. The enclave issues a session token — 32 random bytes, hex-encoded, valid for one hour.

When a subsequent request includes this token in the `app_auth` field, the enclave looks it up in its in-memory session store and retrieves the associated user identity. No network call. No external token service. The session store lives entirely inside the TEE.

### OIDC JWTs

For applications that integrate with existing identity providers — Okta, Auth0, Azure AD, Keycloak — the enclave can verify standard OIDC JWTs. The app developer configures their provider's issuer URL and audience at deploy time. The enclave fetches the JWKS keys and verifies tokens independently.

### Automatic Detection

The enclave does not require the caller to declare which auth method they are using. `verify_auth_token()` inspects the token: if it is a 64-character hex string, it checks the FIDO2 session store first. If that fails, or if the token looks like a JWT, it falls back to OIDC verification. Both paths produce the same `AuthResult` containing the caller's identity and roles, and the same policy enforcement runs regardless of how the caller authenticated.

```
app_auth: "a1b2c3d4...64 hex chars"  →  FIDO2 session lookup  →  AuthResult
app_auth: "eyJhbGciOiJFUzI1NiI..."    →  OIDC JWT verification →  AuthResult

Either way:
    @auth public         → allow
    @auth authenticated  → AuthResult present? allow
    @auth role(admin)    → AuthResult.roles ∩ {admin} ≠ ∅? allow
```

This means an application can support both Privasys Wallet users (FIDO2, hardware-bound, attestation-verified) and standard OIDC users (corporate SSO, social login) with the same WIT annotations. The developer does not have to choose.

## Enclave-Managed Roles: RBAC Without an External Server

OIDC JWTs carry roles in their claims. FIDO2 tokens do not — they are opaque session identifiers with no embedded claims. If you use `@auth role(...)` with FIDO2 users, where do the roles come from?

The answer is inside the enclave.

The `enclave-os-app-auth` module stores role assignments in the application's own sealed key-value space. Each app has an isolated, AES-256 encrypted partition. Role data lives alongside the app's own data, protected by the same hardware sealed key.

### First-User Bootstrap

When the first FIDO2 user authenticates against a new application, the enclave automatically assigns them the `admin` role. No setup script. No manual database entry. The first person in the door is the administrator.

Subsequent users receive configurable default roles (which can be empty). Administrators can manage roles through the `auth` WIT import that the application can optionally use:

```wit
interface auth {
    get-caller-id: func() -> result<string, string>;
    get-my-roles: func() -> result<list<string>, string>;
    list-users: func() -> result<list<tuple<string, list<string>>>, string>;
    get-user-roles: func(user-id: string) -> result<list<string>, string>;
    set-user-roles: func(user-id: string, roles: list<string>) -> result<string, string>;
    remove-user-roles: func(user-id: string) -> result<string, string>;
}
```

The management functions (`list-users`, `get-user-roles`, `set-user-roles`, `remove-user-roles`) are host-enforced to require `admin` or `user-management` role. This enforcement happens at the host boundary, not in guest code. A malicious WASM module cannot bypass it.

### A Concrete Example

Here is a WASM application with three functions at different access levels:

```wit
package privasys:example@0.1.0;

world example {
    import privasys:enclave-os/auth@0.1.0;

    /// Public health check. No auth required.
    /// @auth public
    export hello: func() -> string;

    /// Dashboard for any logged-in user. Returns caller identity.
    /// @auth authenticated
    export auth-hello: func() -> string;

    /// Privileged operation. Only users with hello-role.
    /// @auth role(hello-role)
    export role-hello: func() -> string;
}
```

The guest implementation of `auth-hello` and `role-hello` does not check permissions. It simply calls the `auth` import to read back its caller's identity:

```rust
fn auth_hello() -> String {
    let caller = auth::get_caller_id()
        .unwrap_or_else(|e| format!("unknown ({e})"));
    let roles = auth::get_my_roles()
        .unwrap_or_else(|_| Vec::new());

    format!(r#"{{"caller":"{}","roles":{:?},"message":"hello from inside the enclave"}}"#,
        caller, roles)
}
```

If an unauthenticated caller tries to invoke `auth-hello`, the runtime rejects the call before the WASM function is ever entered. The app code does not need to handle the unauthorised case because it never sees it.

## The Configuration Hash: Attestable Authorisation

One detail that matters for trust: the per-function policy is included in the enclave's attestation evidence.

When an application is loaded, the runtime computes a SHA-256 hash of the complete configuration — the merged auth policies from WIT annotations, the OIDC provider settings, the FIDO2 configuration — and embeds it in the application's RA-TLS certificate under a custom OID (`1.3.6.1.4.1.65230.3.5`).

This means a remote client can verify not just that the enclave is running the expected code, but that the authorisation policy matches what they expect. If the developer annotated `purge-records` as `@auth role(compliance-officer)`, and the attestation confirms the configuration hash, the client has hardware-backed proof that the access control is enforced.

In the Privasys Wallet, this check happens automatically. The wallet verifies the attestation quote, which includes the configuration root, before completing the FIDO2 ceremony. If the authorisation policy has been tampered with, the attestation fails, and the wallet refuses to authenticate.

## MCP Compatibility

For developers following the [Model Context Protocol specification](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization), a natural question is how `@auth` relates to MCP's OAuth 2.1 authorisation framework.

The answer is that they operate at different layers. MCP defines transport-level authorisation: a client discovers a server's auth requirements via Protected Resource Metadata (RFC 9728), obtains an OAuth token from the server's authorisation provider, and sends it as a Bearer token on every request.

`@auth` operates one level deeper: per-function policy enforcement inside the enclave. An MCP client authenticated via OAuth can still be blocked from calling a function annotated `@auth role(admin)` if its token does not carry the right role.

The two compose naturally. OAuth scopes from MCP transport auth map to roles for `@auth role(...)` matching. A client with `scope=compliance-officer` passes the role gate. A client with only `scope=mcp:tools` does not. The enclave does not care whether the role came from an OAuth scope claim, a FIDO2 session lookup, or an OIDC JWT. Policy enforcement is auth-method-agnostic.

## What This Means for Developers

If you are building on the [Privasys Developer Platform](https://developer.privasys.org), per-function auth is available today. The workflow is:

1. **Add `@auth` annotations to your WIT exports.** Use `public`, `authenticated`, or `role(...)` depending on the access level you need.
2. **Import `privasys:enclave-os/auth`** if your functions need to read the caller's identity or manage roles.
3. **Deploy.** The build pipeline extracts your annotations automatically. The enclave enforces them at runtime.
4. **Choose your auth method.** Configure FIDO2 for hardware-bound authentication via Privasys Wallet, OIDC for integration with your existing identity provider, or both.

No middleware. No policy engine. No authorisation server. The enclave reads your WIT annotations and enforces them. The policy is attestable. The trust is hardware-backed.

---

*Enclave OS Mini is open source under AGPL-3.0 at [github.com/Privasys/enclave-os-mini](https://github.com/Privasys/enclave-os-mini). The Privasys Developer Platform is live at [developer.privasys.org](https://developer.privasys.org).*
