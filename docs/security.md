# Deployment security

## Implemented in the repository

- Component IDs and file paths come from the registry allowlist.
- Download parameters reject duplicates, unknown formats and oversized settings.
- ZIP paths reject traversal, drive prefixes, control characters and duplicates. Archives have a 16 MiB input budget and use asynchronous compression.
- Each server process admits at most four source/ZIP jobs at once. Busy responses return 503 and Retry-After: 1. This is a workload ceiling, not a distributed per-IP rate limit.
- ZIP and CLI exports include MIT and resource notices. The CLI checks file hashes, rejects symlink destinations and requires explicit overwrite.
- HTTP headers disable MIME sniffing, limit framing, set referrer/permissions policies and restrict object embedding/base URLs. The CSP deliberately does not yet restrict scripts: deploying a full script policy requires a nonce strategy and browser checks.
- CI scans history and checked-out files with pinned, checksum-verified Gitleaks; dependency and Actions update proposals come from Dependabot.

## Owner actions in Vercel

In the project Security / Firewall dashboard, create a rate-limit rule for paths starting with /api/components/. Start with 60 requests per 60 seconds per client IP and a 429 response. Inspect the dashboard's plan/pricing information and monitor legitimate downloads before enforcement. Shared networks and scripts may need a higher threshold. This rule is not activated by next.config.ts and has not been configured by these local changes.

Official instructions: https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting

Vercel provided HTTPS and HSTS when inspected on 2026-10-17. Confirm the new response headers on motiqo.site after pushing these changes. Protect the Vercel account with MFA and review environment variables and preview access. Never put private tokens in NEXT_PUBLIC_* variables.

## Owner actions in GitHub

Enable private vulnerability reporting, secret scanning/push protection where available, and require the verification checks on main. Review who can push and protect the owner account with MFA. These are account/repository settings; YAML alone does not activate them. Keep Actions permissions at contents: read and review dependency changes before merging.

## Repeat after changes

Run npm test, npm run typecheck, npm run build and npm run verify:exports. Review npm audit findings and the redacted secret scan. Recheck mouse, keyboard, touch, reduced motion, small screens and WebGL fallback when adding visual components. Measure performance on real mobile hardware; test passing is not a Core Web Vitals measurement.

## Local validation snapshot — 2026-10-17

117 tests passed; production build and TypeScript passed. The packed CLI exported 52 components and 154 examples into an independent React project. npm audit reported no known vulnerabilities in the current lockfile. Gitleaks reported no findings in all seven local-history commits or in the files eligible for Git publication. Generated build caches were excluded from that publication scan. These results cover the local revision, not a new production deployment.

Browser review covered Liquid Relic and Event Horizon, keyboard interaction, live settings, particle finish, compact preview, Source, an actual configured ZIP download and the homepage. WebGL reported no console errors in those checks. Device performance and third-party media permissions still require their separate reviews.
