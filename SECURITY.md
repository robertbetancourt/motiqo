# Security policy

Motiqo is an early-stage project. Only the latest main revision receives fixes; there is no supported stable release yet.

## Reporting

Do not post secrets, working exploits or private user data in a public issue. Use GitHub's private vulnerability reporting channel in this repository's Security tab. It was enabled and verified on 2026-10-21; this policy file does not itself configure GitHub. If that channel is unavailable, request a private reporting channel from [Robert Betancourt](https://github.com/robertbetancourt), without including sensitive details.

Include the affected revision, reproduction steps, expected impact and a minimal example. There is no guaranteed response time or bounty program. Test only systems and data you own or have permission to assess.

## Checks and limitations

CI runs redacted secret scanning, dependency auditing, tests, builds and export verification. These checks cannot prove the absence of vulnerabilities. Never add real credentials to public code, examples, issues or screenshots. Rotate an exposed credential even after deleting it from a commit.

See THIRD_PARTY_NOTICES.md for code and media permissions.

## Local MCP server

The downloadable CLI's `mcp` command serves stdio, without an HTTP listener. Its tools read bundled catalog metadata and exact catalog source paths only; they cannot access arbitrary consumer files, write files, run shell commands or fetch URLs. The MCP SDK validates tool arguments. Installation is a separate CLI action with dry-run and conflict checks. A source comment or tool result is data, not authorization to execute instructions.

Download concurrency limits in the web process protect one instance only. They are not a global rate limit across Vercel instances. Baseline response headers include a partial CSP; this does not establish comprehensive XSS protection. Infrastructure limits, stricter CSP compatibility and authenticated deployment configuration require separate validation.
