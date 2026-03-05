# External Integrations

**Analysis Date:** 2026-03-05

## APIs & External Services

**Payment Processing:**
- None detected in the application runtime.
  - SDK/Client: None.
  - Auth: None.
  - Endpoints used: None.
  - Evidence paths: `/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`.

**Email/SMS:**
- None detected in the application runtime.
  - SDK/Client: None.
  - Auth: None.
  - Templates: None.
  - Evidence paths: `/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`.

**External APIs:**
- Google Fonts CDN - Web font delivery for UI typography.
  - Integration method: HTML preconnect + stylesheet links in `/Users/zhangjinhui/Desktop/gsd-demo/index.html`.
  - Auth: None.
  - Rate limits: Managed by provider; no client-side throttling in repository code.
- Brave Search API (tooling-only, optional) - Used by repository CLI helper, not by the browser game runtime.
  - Integration method: REST call via `fetch` in `/Users/zhangjinhui/Desktop/gsd-demo/.codex/get-shit-done/bin/lib/commands.cjs`.
  - Auth: `BRAVE_API_KEY` environment variable read in `/Users/zhangjinhui/Desktop/gsd-demo/.codex/get-shit-done/bin/lib/commands.cjs` and `/Users/zhangjinhui/Desktop/gsd-demo/.codex/get-shit-done/bin/lib/config.cjs`.
  - Rate limits: Not explicitly encoded in repository logic.

## Data Storage

**Databases:**
- None detected.
  - Connection: None.
  - Client: None.
  - Migrations: None.
  - Evidence paths: `/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`.

**File Storage:**
- Local filesystem artifacts for automated test runs.
  - SDK/Client: Node `fs/promises` in `/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js`.
  - Auth: Local OS file permissions.
  - Buckets/targets: `/Users/zhangjinhui/Desktop/gsd-demo/.planning/artifacts/phase-05/burst-latest.png`, `/Users/zhangjinhui/Desktop/gsd-demo/.planning/artifacts/phase-05/burst-latest.json`, `/Users/zhangjinhui/Desktop/gsd-demo/.planning/artifacts/phase-05/burst-console.json`.

**Caching:**
- None detected (no Redis/memcached/browser persistent cache integration).
  - Connection: None.
  - Client: None.
  - Evidence paths: `/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`.

## Authentication & Identity

**Auth Provider:**
- None detected for gameplay runtime.
  - Implementation: N/A.
  - Token storage: N/A.
  - Session management: N/A.
  - Evidence paths: `/Users/zhangjinhui/Desktop/gsd-demo/index.html`, `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`.

**OAuth Integrations:**
- None detected.
  - Credentials: None.
  - Scopes: None.
  - Evidence paths: `/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`.

## Monitoring & Observability

**Error Tracking:**
- No external error tracking service detected.
  - DSN: None.
  - Release tracking: None.
  - Evidence paths: `/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`.

**Analytics:**
- None detected.
  - Token: None.
  - Events tracked: None.
  - Evidence paths: `/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`.

**Logs:**
- Local Playwright capture only (console + page errors), persisted as test artifacts.
  - Integration: `/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js`.

## CI/CD & Deployment

**Hosting:**
- No hosting platform integration is explicitly configured in repository runtime files.
  - Deployment: Local preview via `vite preview` in `/Users/zhangjinhui/Desktop/gsd-demo/package.json`.
  - Environment vars: No platform-managed variable manifest found; `.env*` files are absent in repository root listing.
  - Evidence paths: `/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/.gitignore`.

**CI Pipeline:**
- No CI workflow configuration detected in this repository snapshot.
  - Workflows: None found.
  - Secrets: None declared in repository files.
  - Evidence paths: `/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/.gitignore`.

## Environment Configuration

**Development:**
- Required env vars: none for browser game runtime; optional `BRAVE_API_KEY` for tooling search command.
- Secrets location: process environment for optional CLI key (`/Users/zhangjinhui/Desktop/gsd-demo/.codex/get-shit-done/bin/lib/config.cjs`).
- Mock/stub services: `window.__GSD_DISABLE_WEBGL__` init flag in `/Users/zhangjinhui/Desktop/gsd-demo/tests/playwright-burst.test.js`, consumed in `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`.

**Staging:**
- No dedicated staging integration profile detected.
- Data: No separate staging data store configured in repository code.
- Evidence paths: `/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`.

**Production:**
- Secrets management: Not specified in repository runtime files.
- Failover/redundancy: Not specified in repository runtime files.
- Evidence paths: `/Users/zhangjinhui/Desktop/gsd-demo/package.json`, `/Users/zhangjinhui/Desktop/gsd-demo/index.html`.

## Webhooks & Callbacks

**Incoming:**
- No incoming HTTP webhook endpoints detected.
  - Verification: N/A.
  - Events: N/A.
  - Evidence paths: `/Users/zhangjinhui/Desktop/gsd-demo/index.html`, `/Users/zhangjinhui/Desktop/gsd-demo/src/main.js`.

**Outgoing:**
- No outgoing business webhooks detected in gameplay runtime.
- Tooling-only external request exists for Brave Search.
  - Endpoint: `https://api.search.brave.com/res/v1/web/search` in `/Users/zhangjinhui/Desktop/gsd-demo/.codex/get-shit-done/bin/lib/commands.cjs`.
  - Retry logic: Not explicitly implemented in repository source.

---

*Integration audit: 2026-03-05*
*Update when adding/removing external services*
