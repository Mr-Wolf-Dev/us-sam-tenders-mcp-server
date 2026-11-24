# SAM.gov US Federal Contracts & Grants Scraper (Keyless + MCP Server)

Extract, filter, and normalize **active US federal contract opportunities**, **government RFPs**, **solicitations**, **NAICS codes**, and **contracting officer contacts** directly from **SAM.gov** — **with zero API key required**, available both as an **HTTP-only Apify Actor** and as a **Standby MCP Server** for AI agents.

Designed for **Pay-Per-Event (PPE)** cost efficiency with **zero headless browsers** (runs smoothly on **256 MB RAM**).

---

## Why Use This Keyless SAM.gov Scraper & MCP Server?

- **No SAM.gov API Key Required:** Queries SAM.gov's public `hal+json` endpoints directly over HTTP with automatic retries (`429`/`5xx`).
- **256 MB RAM, Zero Browser Overhead:** Fast execution and maximum PPE margin.
- **Structured Agency Hierarchy & Deadlines:** Extracts `department`, `agency`, `office`, `solicitationNumber`, `noticeType`, `publishedDate`, and `responseDeadline`.
- **Optional Deep Enrichment (`includeDetails`):** Fetches `naicsCodes`, `classificationCode`, and `pointOfContact` (contracting officer name, email, and phone).
- **Dual Mode (Batch + Standby MCP):** Connect **n8n**, **Make**, **Claude Desktop**, or **Cursor** directly.

---

## Input Examples (Copy-Paste)

### 1. Active Software & IT Federal Solicitations
```json
{
  "query": "software",
  "noticeTypes": ["o", "k"],
  "activeOnly": true,
  "includeDetails": true,
  "maxItems": 25
}
```

### 2. Department of Defense Opportunities with Upcoming Deadlines
```json
{
  "departments": ["DEFENSE"],
  "activeOnly": true,
  "minDeadline": "2026-12-01",
  "maxItems": 50
}
```

---

## Standby MCP Server for AI Agents

Connect **Cursor**, **Claude Desktop**, or any Streamable HTTP MCP client to:

```text
https://mr-wolf-1--us-sam-tenders-mcp-server.apify.actor/mcp
```

### Exposed MCP Tools
- `search_us_contracts(query, noticeTypes, departments, activeOnly, publishedFrom, minDeadline, includeDetails, maxItems)`
- `get_opportunity_details(opportunityId)`

See [`docs/integrations/mcp-clients.md`](./docs/integrations/mcp-clients.md) for client configuration snippets.

---

## Automation Integrations (n8n & Make)

- **n8n workflow template:** [`docs/integrations/n8n-workflow.json`](./docs/integrations/n8n-workflow.json)
- **Make.com scenario blueprint:** [`docs/integrations/make-scenario.json`](./docs/integrations/make-scenario.json)

---

## Pay-Per-Event (PPE) Pricing

- `apify-actor-start`: Standard Actor startup event.
- `tender-extracted`: Charged once per normalized opportunity pushed to the dataset in batch mode.
- `mcp-query`: Charged once per MCP tool invocation in Standby mode.

---

## Frequently Asked Questions (FAQ)

**Do I need a GSA / SAM.gov API key to run this Actor?**
No. It works out of the box without any SAM.gov account or API key.

**Can I extract contracting officer emails and NAICS codes?**
Yes. Set `"includeDetails": true` in batch mode, or call the `get_opportunity_details` MCP tool with any `opportunityId`.

**Does it require proxies or a headless browser?**
No. It runs HTTP-only on `256 MB` RAM.

---

## Local Development

```bash
npm run typecheck && npm run lint && npm test && npm run build
apify run --purge
```


---

## Related Actors by mrWolf

- **[EU Public Tenders & Grants Monitor (TED Europa + MCP)](https://apify.com/mr.wolf/eu-tenders-mcp-server)** — Extract and filter active European public procurement notices from TED Europa.
- **[Tech & Startup Jobs Scraper (Greenhouse, Lever, Ashby, SmartRecruiters + MCP)](https://apify.com/mr.wolf/ats-jobs-mcp-server)** — Extract live tech jobs, salaries, and B2B hiring signals.
- **[B2B Domain Intelligence & Email Verifier + MCP](https://apify.com/mr.wolf/domain-intel-mcp-server)** — Detect tech stack, DNS/MX/SPF/DMARC readiness, and company contacts.
