---
title: "A Practical Guide for an Attested Web"
author: "Privasys Engineering Team"
date: "2026-02-19"
---

## The Trust Problem in Confidential Computing

Confidential Computing promises that data stays encrypted even while being processed, shielded from the cloud provider, the host OS, and the hypervisor. Technologies like Intel TDX (Trust Domain Extensions) make this possible by running entire virtual machines inside a hardware-enforced boundary where memory is encrypted, CPU state is isolated, and even a compromised hypervisor cannot peek inside.

But there is an unsolved UX problem: **how does a remote client know it's actually talking to a genuine TEE?**

The traditional answer is *remote attestation*: the TEE produces a cryptographic quote signed by the hardware, proving its identity and integrity. A verifier checks this quote against the chip vendor's root of trust. This works, but it requires custom client-side code, specialised SDKs, and an out-of-band attestation flow that is completely alien to the browser-based web.

## Enter RA-TLS: Attestation Meets the Browser

RA-TLS (Remote Attestation TLS) solves this by embedding the attestation evidence directly into a standard **X.509 certificate**. The concept, discussed in the [IETF RATS working group](https://datatracker.ietf.org/wg/rats/about/), is elegant:

1. The TEE generates a key pair.
2. It requests attestation from the hardware, binding the public key to the quote via the `ReportData` field.
3. It builds an X.509 certificate carrying the quote in a custom extension OID.
4. This certificate is served over standard TLS.

The result is a **normal HTTPS connection** from the client's perspective. Any TLS client (a browser, `curl`, a mobile app) can connect without modification. The attestation evidence rides along inside the certificate for any verifier that wants to inspect it, while clients that don't care simply see a valid TLS handshake.

### Why This Matters

- **Zero client-side changes.** No custom SDK, no attestation protocol, no out-of-band channel. HTTPS just works.
- **Composable with existing PKI.** The RA-TLS cert can be signed by a private CA, chaining into your organisation's existing trust hierarchy.
- **Cryptographic binding.** The quote's `ReportData` contains a hash of the public key, so the attestation is inseparable from the TLS session.
- **Verifiable by anyone.** A relying party extracts the quote from the certificate extension, verifies it against the vendor's attestation infrastructure, and re-derives the `ReportData` from the certificate's public key to confirm the binding.
- **Compatible with TLS 1.3.** Works with modern protocol versions, ECDSA keys, and HTTP/2.

### Deterministic vs. Challenge-Response Attestation

RA-TLS can work in two modes:

**Deterministic attestation** binds the quote to the certificate's public key and a known time value. The verifier can reproduce the `ReportData` from the certificate alone, with no interactive protocol needed. Since certificates are renewed on a regular schedule (every 24 hours in our case), this provides a satisfactory level of trust: the quote proves the key was generated inside the TEE within the last renewal window.

**Challenge-response attestation** (per `draft-ietf-rats-tls-attestation`) binds the quote to a client-supplied nonce sent in the TLS ClientHello. This proves freshness at the connection level, but requires the TLS library to expose raw ClientHello extension payloads.

Today, Go's `crypto/tls` does not expose raw extension payloads from the ClientHello. We are working on a fork and plan to submit an upstream PR to enable this. Once available, clients will be able to send a challenge and receive a per-connection RA-TLS certificate that proves the TEE was live at that exact moment.

That said, **most users will not need challenge-response attestation.** A deterministic certificate with a quote bound to a recent creation time is sufficient for the vast majority of use cases. To keep things simple and reproducible, we compute:

$$\text{ReportData} = \text{SHA-512}\big(\text{SHA-256}(\text{DER public key}) \;\|\; \text{creation\_time}\big)$$

where `creation_time` is the certificate's `NotBefore` truncated to 1-minute precision (`"2006-01-02T15:04Z"`). With 24-hour certificate renewal, any verifier can confirm the key was generated inside the TEE within the last day by reproducing this value from the certificate fields alone.

## Serving RA-TLS from a TDX Confidential VM

### Why Caddy?

Integrating RA-TLS into a web server means the server itself must generate keys inside the TEE, obtain hardware quotes, and construct certificates on the fly. We needed a server that is:

| Requirement | Caddy | Nginx |
|---|---|---|
| **Modular TLS issuance** | First-class `tls.issuance` module API: plug in any certificate source | TLS is handled by OpenSSL; custom issuance requires patching the source or using Lua hacks |
| **Automatic cert lifecycle** | Built-in via [CertMagic](https://github.com/caddyserver/certmagic): handles generation, caching, renewal, and OCSP stapling | Manual or via certbot; no native renewal loop for custom issuers |
| **Single binary, no dependencies** | Pure Go, statically compiled, one binary to deploy | Requires OpenSSL, PCRE, and often multiple config files |
| **Configuration** | Simple Caddyfile or full JSON API | Complex `nginx.conf` syntax, especially for TLS edge cases |
| **Extensibility** | Write a Go module, compile once with `xcaddy` | Write a C module or Lua script, rebuild from source |
| **Memory safety** | Go's memory-safe runtime | C/C++ codebase, a larger attack surface inside a TEE |

Caddy's architecture made the integration remarkably clean. We implemented a single `tls.issuance` module (`ra_tls`) that plugs into the standard certificate automation pipeline. Caddy handles caching, renewal timers, OCSP, and serving; our module just generates keys, obtains quotes, and signs certificates.

### The Module: `ra-tls-caddy`

The module is open source and available at:

> **[github.com/Privasys/ra-tls-caddy](https://github.com/Privasys/ra-tls-caddy)**

### Architecture

```
┌─────────────────────────────────────────────────┐
│   Caddy  +  CertMagic                           │
│                                                 │
│   ┌─────────────────────────────────────────┐   │
│   │  ra_tls issuer                          │   │
│   │                                         │   │
│   │  1. GenerateKey() → ECDSA P-256         │   │
│   │  2. Issue()                             │   │
│   │     ├─ Compute ReportData               │   │
│   │     ├─ attester.Quote(reportData) ──────┼───┼──> /sys/kernel/config/tsm/report
│   │     ├─ Build X.509 + embed quote        │   │
│   │     └─ Sign with intermediary CA        │   │
│   └─────────────────────────────────────────┘   │
│                                                 │
│   ┌──────────┐                                  │
│   │ Attester │ ← pluggable backend              │
│   │  • tdx   │   (Intel TDX via configfs-tsm)   │
│   └──────────┘                                  │
└─────────────────────────────────────────────────┘
```

### Caddyfile Configuration

```caddyfile
example.com {
    tls {
        issuer ra_tls {
            backend tdx
            ca_cert /path/to/intermediate-ca.crt
            ca_key  /path/to/intermediate-ca.key
        }
    }
    reverse_proxy 127.0.0.1:8000
}
```

## Deploying on a GCP TDX Confidential VM

Google Cloud Platform offers [Confidential VMs with Intel TDX](https://cloud.google.com/confidential-computing/confidential-vm/docs/create-a-confidential-vm-instance) in selected regions. Here is how we set up our deployment.

### 1. Create the VM

We used a **C3** machine type in `europe-west9` (Paris) with Confidential VM enabled and **Intel TDX** as the confidential computing technology. The VM runs Ubuntu 24.04 LTS.

After creation, verify TDX is active:

```bash
ls /sys/kernel/config/tsm/report
```

If this path exists, the kernel's configfs-tsm interface is available and TDX attestation will work.

### 2. Install Go and Build Caddy

The module requires Go 1.25+. Install the latest Go release:

```bash
wget https://go.dev/dl/go1.26.0.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.26.0.linux-amd64.tar.gz
echo 'export PATH=/usr/local/go/bin:$HOME/go/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

Then build Caddy with the RA-TLS module:

```bash
go install github.com/caddyserver/xcaddy/cmd/xcaddy@latest
git clone https://github.com/Privasys/ra-tls-caddy.git
cd ra-tls-caddy
xcaddy build --with github.com/Privasys/ra-tls-caddy=.
```

### 3. Transfer the Intermediary CA Credentials

Securely copy the intermediate CA certificate and private key into the VM with `gcloud compute scp`.

### 4. Create a simple API with DENO

Our ultimate goal is that **all web services running inside a Confidential VM are protected end-to-end**, from the application layer through TLS down to the hardware attestation. While the example in this article is deliberately simple, we chose [Deno](https://deno.land/) because it is an excellent runtime for serving TypeScript-coded APIs in this context:

- **Secure by default.** Permissions are explicit (`--allow-net`, `--allow-read`), reducing the attack surface inside the TEE.
- **Built-in TypeScript.** No build step, no transpiler, just write `.ts` and run.
- **Single binary.** Like Caddy, Deno ships as one executable, keeping the VM image minimal.
- **Modern runtime.** Native `fetch`, Web Streams, and `Deno.serve()` for zero-dependency HTTP servers.

Install Deno:

```bash
curl -fsSL https://deno.land/install.sh | sh
echo 'export DENO_INSTALL="$HOME/.deno"' >> ~/.bashrc
echo 'export PATH="$DENO_INSTALL/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

Create a simple API:

```typescript
// ~/hello-api/main.ts
Deno.serve({ port: 8000, hostname: "127.0.0.1" }, (_req: Request) => {
  return new Response(JSON.stringify({ message: "Hello from TDX!" }), {
    headers: { "content-type": "application/json" },
  });
});
```

Even though our example is a "Hello World", the architecture is the same one we intend to use for production workloads: AI inference, data clean rooms, privacy-preserving APIs. Deno gives us a lightweight, secure, and developer-friendly runtime to pair with Caddy's RA-TLS termination. The pattern is always the same: **Caddy terminates TLS with an attestation-enriched certificate, and Deno serves the application logic on localhost.**

Start it:

```bash
cd ~/hello-api
nohup deno run --allow-net main.ts > /tmp/deno.log 2>&1 &
```

### 5. Configure and Start Caddy

Create the Caddyfile:

```caddyfile
example.com {
    tls {
        issuer ra_tls {
            backend tdx
            ca_cert /home/user/certs/intermediate-ca.crt
            ca_key  /home/user/certs/intermediate-ca.key
        }
    }
    reverse_proxy 127.0.0.1:8000
}
```

TDX quote generation requires writing to `/sys/kernel/config/tsm/report`, which is root-owned. The kernel creates files inside each report entry with restrictive permissions, so Caddy must run as root:

```bash
sudo ./caddy run --config ~/Caddyfile
```

## Inspecting the RA-TLS Certificate

Once Caddy is running, you can inspect the certificate and its TDX attestation extension using standard command-line tools:

```bash
# Retrieve and display the full certificate
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null \
  | openssl x509 -noout -text
```

In the output, look for the custom X.509 extension carrying the TDX quote:

```
X509v3 extensions:
    ...
    1.2.840.113741.1.5.5.1.6:
        <hex dump of the TDX quote, ~8000 bytes of attestation evidence>
```

To save the certificate and extract the raw quote for programmatic verification:

```bash
# Save the PEM certificate
echo | openssl s_client -connect example.com:443 -servername example.com 2>/dev/null \
  | openssl x509 -outform PEM > ratls-cert.pem

# Show the TDX quote extension
openssl x509 -in ratls-cert.pem -noout -text | grep -A2 "1.2.840.113741.1.5.5.1.6"

# Parse the ASN.1 structure to find the extension offset and raw bytes
openssl asn1parse -in ratls-cert.pem
```

A complete verification flow would:

1. Validate the certificate chain back to the trusted root CA.
2. Extract the raw TDX quote from extension OID `1.2.840.113741.1.5.5.1.6`.
3. Verify the quote against Intel's attestation infrastructure (e.g. using [go-tdx-guest](https://github.com/google/go-tdx-guest) or Intel's DCAP libraries).
4. Read the certificate's `NotBefore`, format it as `"2006-01-02T15:04Z"`.
5. Compute `SHA-512( SHA-256(DER public key) || formatted_time )` and confirm it matches the quote's `ReportData`.
6. Check the quote's measurement registers (MRTD, RTMR) against expected values for your workload.

## What's Next

- **Verification tooling.** A client-side library and CLI to extract and verify the TDX quote from RA-TLS certificates in a single command.
- **AMD SEV-SNP support.** The `Attester` interface is designed for pluggable backends; an SEV-SNP attester is planned.
- **Challenge-response attestation.** We are working on a Go `crypto/tls` fork (and upstream PR) to expose raw ClientHello extension payloads. This will enable per-connection freshness proofs where each TLS handshake carries a unique client nonce bound to the attestation quote.
- **Production hardening.** systemd integration, encrypted storage for Caddy's data directory, and minimal container images.

---

*The ra-tls-caddy is open source under the AGPL-3.0 licence. Contributions and feedback are welcome at [github.com/Privasys/ra-tls-caddy](https://github.com/Privasys/ra-tls-caddy).*
