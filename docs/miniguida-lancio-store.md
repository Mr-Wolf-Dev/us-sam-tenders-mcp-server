# Miniguida Operativa: Lancio & SEO su Apify Store — `us-sam-tenders-mcp-server`

Guida rapida per configurare **Publication**, **Icona**, **256 MB RAM** e **Pay-Per-Event (PPE)** su Apify Console per `mr.wolf/us-sam-tenders-mcp-server`.

---

## 1. Configurazione `Publication` (SEO Apify Store)

- **Title (SEO):**
  ```text
  SAM.gov US Federal Contracts & Grants Scraper (Keyless + MCP)
  ```
- **Short description:**
  ```text
  Extract active US federal contract opportunities, RFPs, NAICS codes & contracting officer contacts from SAM.gov with no API key required. 256 MB HTTP-only Actor + Standby MCP Server.
  ```
- **Categories:** `Business`, `Lead generation`, `AI`
- **Icona:** carica `assets/actor-icon.png` (alto contrasto, leggibile a 48×48 px).
- **Visibility:** `Public`

---

## 2. Default Run Options (Massimo Margine PPE)

- **Memory:** `256 MB`
- **Timeout:** `120` secondi
- **Build tag:** `latest`

---

## 3. Monetizzazione Pay-Per-Event (PPE)

1. Mantieni `apify-actor-start` (`$0.00005`).
2. Rimuovi `apify-default-dataset-item` (`Result`).
3. Configura gli eventi custom:
   - `tender-extracted` — *Title:* `Tender extracted` — *Description:* `Single normalized US federal opportunity extracted from SAM.gov.` — *Price:* `$0.005` – `$0.01`
   - `mcp-query` — *Title:* `MCP tool query` — *Description:* `Single MCP tool invocation (search_us_contracts or get_opportunity_details) in Standby mode.` — *Price:* `$0.02` – `$0.05`
4. Attiva gli sconti automatici Store (`Bronze` / `Silver` / `Gold`).
5. **Primary event:** `tender-extracted`.
