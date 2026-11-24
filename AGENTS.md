# AGENTS.md

Repository rules and engineering workflow for **SAM.gov US Federal Contracts & Grants + MCP**.

## Architecture & Boundaries

- **TypeScript strict mode** (`strict: true`, `noUncheckedIndexedAccess: true`, ESM `NodeNext`).
- **HTTP-only**: Never introduce Playwright, Puppeteer, or headless browser dependencies. Target `< 512 MB` RAM.
- **Pure `src/domain/`**: `src/domain/**` MUST NOT import `apify`, `crawlee`, `got-scraping`, `@modelcontextprotocol/sdk`, or `../shared/*` (enforced by `eslint.config.js`).
- **Ports & Adapters**:
  - `src/domain/`: Zod schemas, pure parsers, filters, normalization.
  - `src/ports/`: Interfaces / pre-agreed test seams (`DataSource`).
  - `src/shared/`: Reusable runtime kit (`billing-meter.ts`, `http-client.ts`, `mcp-http-server.ts`, `actor-runner.ts`).
  - `src/adapters/`: Platform wiring (`apify-actor.ts`, `mcp-server.ts`, HTTP sources).
  - `src/main.ts`: Thin entrypoint.

## Verification Commands

Always run before pushing:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```
