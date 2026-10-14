# globaml.com

The GlobAML placeholder page: one static page over an illustrative
transaction network (no real accounts), served from `vm-ovh-fr-par-1`.

These files are the built site and are deployed as they are, by the
`Deploy globaml.com to OVH` workflow (dispatch only). `index.html` carries
the page, its styles, the network data and its drawing script.

- Fonts are served from the site (latin subsets, variable): Archivo, Public
  Sans and JetBrains Mono, all under the SIL Open Font License 1.1.
- Analytics: Plausible, through the site's own `/pa/` proxy (nginx) to the
  Privasys instance.
- The nginx site lives in `/etc/nginx/sites-available/globaml.com` on the VM
  (TLS by Let's Encrypt, www redirects to the apex).
