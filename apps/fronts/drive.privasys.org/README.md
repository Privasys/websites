# drive.privasys.org

The web UI for **Privasys Drive** — a Google-Drive / SharePoint-style front for
the confidential Drive backend (an attested enclave app). Directories, files,
and per-file / per-folder permissioning, with everything sealed end-to-end from
the browser to the enclave.

## Architecture

- **Static Next.js export** (`output: 'export'`), served by nginx on the OVH web
  host at `/var/websites/drive.privasys.org/` — same pattern as the other
  fronts.
- **Auth**: the Privasys wallet via `@privasys/auth` (copied provider from
  `chat.privasys.org`). Sign-in opts into the sealed session-relay flow with
  `sessionRelayHost = NEXT_PUBLIC_DRIVE_APP_HOST`, so the wallet attests the
  Drive enclave's quote in the same ceremony.
- **Transport**: the browser talks to the Drive backend over a **sealed session**
  (`SealedSession.request`, CBOR-AES-GCM via `relay.privasys.org`). File bytes
  and metadata are sealed browser→enclave; the gateway only sees ciphertext.
  Drive authenticates the sealed session itself (the relay asserts the
  wallet-vouched `X-Privasys-Sub`), so no bearer travels in the clear.
- **API client**: `lib/drive-api.ts` maps the Drive REST surface
  (`/v1/...`) onto the sealed session.

## Permissioning

The UI exposes the Drive backend's three access layers:

- **Share with people** (Google-Drive style) — per-file and per-folder grants
  (`POST .../nodes/{id}/grants`, read or read+write), listed and revocable in the
  Share dialog. A folder share cascades to its subtree.
- **Folder ACL overrides** (SharePoint style) — narrow a folder subtree to a set
  of member roles (`PUT .../nodes/{id}/acl`), with inheritance; shown for
  enterprise workspaces.
- **Shared with me** — inbound shares across tenants (`GET /v1/shared`).

The Share dialog reads `GET /v1/tenants/{id}/nodes/{node}/permissions` (grants +
own ACL + effective ACL).

## Environment

| Var | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_DRIVE_APP_HOST` | `drive-demo.apps-test.privasys.org` | Drive enclave hostname the UI seals a session to. Point at your production Drive instance to go live. |
| `NEXT_PUBLIC_API_BASE_URL` | `https://api-test.developer.privasys.org` | management-service the wallet SDK reads (mostly cosmetic; the frame-host overrides it). |

## Develop

```bash
NEXT_PUBLIC_DRIVE_APP_HOST=drive-demo.apps-test.privasys.org \
  npx nx serve drive.privasys.org   # http://localhost:4215
```

## Deploy

`.github/workflows/deploy-drive.yml` (`workflow_dispatch`) builds the static
export and publishes it atomically to `/var/websites/drive.privasys.org/` on
OVH. Pass `drive_host` / `api_base` inputs to target a production backend.

**nginx** (on the OVH host, not in this repo) needs a server block for
`drive.privasys.org` with `root /var/websites/drive.privasys.org;` and a
SPA-style fallback, e.g.:

```nginx
server {
    listen 443 ssl http2;
    server_name drive.privasys.org;
    root /var/websites/drive.privasys.org;
    index index.html;
    location / { try_files $uri $uri/ $uri.html /index.html; }
    # ssl_certificate ... (Let's Encrypt, like the other vhosts)
}
```
