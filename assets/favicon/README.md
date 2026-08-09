# Favicon and brand-icon source

This is the single source of truth for the Privasys favicon and brand-icon set
(the icons the sites serve at `/favicon/*`: `favicon.svg`, `favicon.ico`,
`favicon-96x96.png`, `apple-touch-icon.png`, `site.webmanifest`, the
`privasys-logo*` marks and the open-graph images).

Each static front serves these from its own `public/favicon/` (Next copies
`public/` into the export verbatim). To avoid drift, treat this directory as
canonical: when the brand set changes, update it here and copy it into every
front's `public/favicon/`. `drive.privasys.org` and `developer.privasys.org`
are already aligned to this set. The remaining fronts should be migrated to
copy from here (a small prebuild copy step) rather than keeping their own
divergent icons.

Every front additionally serves the icon at the root path `/favicon.svg`
(clients and link-preview scrapers request it unprompted): each app keeps a
copy of `favicon.svg` directly in `public/`. When updating the brand set,
refresh that root copy too.
