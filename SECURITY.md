# Security policy

Motiqo is an early-stage project. Only the latest main revision receives fixes; there is no supported stable release yet.

## Reporting

Do not post secrets, working exploits or private user data in a public issue. Request a private reporting channel from [Robert Betancourt](https://github.com/robertbetancourt), without including sensitive details. If GitHub shows a private vulnerability reporting button in this repository's Security tab, use that channel. Private reporting must first be enabled by the repository owner; this file does not enable it.

Include the affected revision, reproduction steps, expected impact and a minimal example. There is no guaranteed response time or bounty program. Test only systems and data you own or have permission to assess.

## Checks and limitations

CI runs redacted secret scanning, dependency auditing, tests, builds and export verification. These checks cannot prove the absence of vulnerabilities. Never add real credentials to public code, examples, issues or screenshots. Rotate an exposed credential even after deleting it from a commit.

See [deployment security](docs/security.md) for the remaining Vercel and GitHub settings. See THIRD_PARTY_NOTICES.md for code and media permissions.
