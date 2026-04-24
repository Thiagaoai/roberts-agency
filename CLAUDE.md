# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Repository Is

This is a **planning and documentation repository** (written in Portuguese) for a 5-phase sales automation system. It contains architectural guides, bash setup scripts, and Node.js code scaffolds intended to be implemented on a VPS using Cursor IDE.

## Repository Contents

| File/Directory | Purpose |
|----------------|---------|
| `index.md` | Master reading guide and navigation |
| `00-indice.md` | Master index for all 5 phases |
| `roadmap.md` | Timeline and deliverables per phase |
| `como_usar_ide.md` | IDE and model selection guidance |
| `guia.final.md` | Final workflow summary |
| `fase01.md` | Phase 1: Infrastructure (SDD + PRD + bash scripts) |
| `fase02.md` | Phase 2: SDR Agent (SDD + PRD + Node.js code) |
| `fase03.md` | Phase 3: Email + Calendar (SDD + PRD + Node.js code) |
| `fase04.md` | Phase 4: Monitoring (SDD + PRD + Node.js code) |
| `fase05.md` | Phase 5: Marketing Squad (SDD + PRD + 11 agents + Node.js code) |
| `scripts/` | Bash setup scripts for Phase 1 VPS provisioning |
| `FASE-5/CÓDIGO_FASE_5/` | Node.js code scaffold for Phase 5 Marketing Squad |

## Phase 1 Setup Scripts

Run these sequentially to provision the VPS (scripts are in `scripts/`):

```bash
bash scripts/setup-vps.sh          # Node.js 20 + pnpm installation
bash scripts/setup-paperclip.sh    # Paperclip install + systemd service
bash scripts/setup-env.sh          # Create .env with credentials
bash scripts/final-verification.sh # Verify all 11 checks pass
# fix-paperclip-service.sh is available for troubleshooting
```

## Phase 5 Code Scaffold

The scaffold at `FASE-5/CÓDIGO_FASE_5/` uses **ES6 modules** (`"type": "module"`). Key npm scripts:

```bash
pnpm start          # node index.js
pnpm dev            # node --watch index.js
pnpm test           # node --test src/tests/*.test.js
pnpm logs           # journalctl -u marketing-squad -f
pnpm status         # systemctl status marketing-squad
```

Scaffold structure:
- `src/config.js` — centralized config for all services, cron schedules, rate limits
- `src/utils/logger.js` — Winston logger with Telegram alert integration
- `src/integrations/supabase.js` — typed Supabase client with domain methods
- `src/integrations/openai.js`, `meta-ads.js`, `runway.js`, `semrush.js` — API wrappers

## System Architecture (When Implemented)

The target system runs on a VPS (Ubuntu 22.04, "Hermes"):

**Phase 1 — Infrastructure**
- Paperclip AI server (port 3100) managed by systemd
- Supabase (PostgreSQL) for persistence: `leads`, `metrics`, `tasks` tables
- Telegram bot for operator control

**Phase 2 — SDR Agent**
- Apollo.io API for lead search and enrichment
- Google Ads API for intent signal capture
- Writes qualified leads to Supabase

**Phase 3 — Email + Calendar**
- SendGrid for automated outbound email sequences
- Google Calendar API for meeting scheduling

**Phase 4 — Monitoring**
- LangSmith for LLM observability
- Prometheus + Grafana dashboards

**Phase 5 — Marketing Squad**
- CMO Agent (port 3200) orchestrating 11 specialized agents
- Strategist Agent: daily campaign planning (7am)
- Copywriter Agent: ad copy generation via GPT-4o (every 4h)
- Image Creator Agent: DALL-E 3 image generation (every 4h)
- Video Creator Agent: Runway ML video generation (Mondays 9am)
- Google Ads Agent: bid optimization + performance tracking (every 2h)
- Meta Ads Agent: campaign management + audience creation (every 2h)
- SEO Agent: keyword ranking + competitor analysis (every 12h)
- Analytics Agent: performance metrics + insights (every 6h)
- Developer Agent: landing page code generation (on-demand)
- Supervisor Agent: QA + brand compliance + approval scoring ≥7/10 (every hour)
- Data flow: SDR leads → campaigns → content generation → Supervisor approval → ads launch → Analytics → Telegram daily report

**Data flow:** `Telegram command → Paperclip → Supabase query → Telegram response + journalctl log` (Phases 1-4) + `CMO Agent → 11 Marketing Agents → Campaign Pipeline → Real-time ads + Analytics` (Phase 5)

## Technology Stack

- **Runtime:** Node.js 20 LTS, pnpm
- **Process management:** systemd (not PM2)
- **Database:** Supabase PostgreSQL (9 tables in Phase 5: campaigns, content_pieces, ad_sets, analytics_reports, approvals, seo_keywords, landing_pages, marketing_leads, brand_assets)
- **LLM:** OpenAI GPT-4o (primary agents)
- **Image gen:** DALL-E 3 | **Video gen:** Runway ML (model: gen3)
- **Ads:** Google Ads API v17, Meta Marketing API v19
- **SEO:** SEMrush | **Assets:** Cloudinary
- **Monitoring:** LangSmith, Prometheus, Grafana
- **Logging:** Winston (file) + journalctl (systemd)

## Implementation Approach

Each phase document (`fase0N.md`) follows this structure:
1. **SDD** — system design with architecture diagrams
2. **PRD** — feature requirements with acceptance criteria
3. **Scripts/Code** — bash scripts (Phase 1) or Node.js files (Phases 2+)
4. **Debugger** — documented solutions for expected errors
5. **Checklist** — step-by-step execution order

Read the full phase document before writing any code.

## Key External Services Required

### Phases 1-4
- **Supabase** — free tier; need `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `PAPERCLIP_DATABASE_URL`
- **Telegram** — bot token from @BotFather + operator user ID
- **Apollo.io** — Phase 2
- **Google Ads + Calendar** — API credentials for Phases 2-3
- **SendGrid** — Phase 3
- **LangSmith** — Phase 4

### Phase 5 (Marketing Squad)
- **OpenAI** — `OPENAI_API_KEY` (GPT-4o + DALL-E 3)
- **Meta** — `META_ACCESS_TOKEN`, `META_AD_ACCOUNT_ID`, `META_PIXEL_ID`
- **Runway ML** — `RUNWAY_API_KEY`
- **SEMrush** — `SEMRUSH_API_KEY`
- **Cloudinary** — `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **Google Ads** — reused from Phase 2
