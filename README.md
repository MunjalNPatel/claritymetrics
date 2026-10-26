# ClarityMetrics — Automated Reporting & AI Dashboards

> Power BI dashboards · Automated KPI reporting · AI-generated executive summaries

Live site: **[https://claritymetrics.org](https://claritymetrics.org)**

---

## What this is

Marketing site for ClarityMetrics, an automated reporting and dashboard service for small businesses. It includes eight interactive sample dashboards across different industries, pricing, an FAQ, and a free-sample-report offer.

## Live dashboard examples

| Dashboard | Industry | Description |
|---|---|---|
| [Bloom & Co.](dashboards/ecommerce.html) | Ecommerce | Revenue trends, order volume, category breakdown, KPI status, AI alerts |
| [Vantage Media](dashboards/agency.html) | Marketing Agency | ROAS by channel, conversion funnel, top campaigns, MoM shifts |
| [Serenity Wellness](dashboards/medspa.html) | Med Spa / Wellness | AI executive summary, benchmark context, retention analysis, action plan |
| [Harvest Table](dashboards/restaurant.html) | Restaurant | Daily revenue, covers, food & labor cost, menu performance |
| [Elevate Fitness](dashboards/fitness.html) | Fitness Studio | MRR, retention, class fill rate, churn alerts |
| [Premier Realty](dashboards/realestate.html) | Real Estate | GCI, agent leaderboard, pipeline by stage, lead sources |
| [Launchnode](dashboards/saas.html) | SaaS | MRR movement, plan mix, NRR, LTV:CAC, churn risk |
| [Vexo Technologies](dashboards/salesforce.html) | B2B Sales / CRM | Quota attainment, pipeline, deal stages, top opportunities |

> All example businesses and figures are fictional, created for demonstration.

## Plans

| Plan | Monthly | Setup | Highlights |
|---|---|---|---|
| Snapshot Report | $297 | $300 | Monthly KPI report, AI summary, 3-month trends |
| Insight Dashboard *(most popular)* | $597 | $500 | Live Power BI dashboard, weekly KPI email, 2 alerts, monthly review |
| Executive Intelligence | $997 | $800 | White-label, multi-source, benchmarks, bi-weekly strategy call |

Annual billing = 10× monthly. Extra data sources $100/mo each. Data cleanup sprint $150–$400.

## Before publishing — replace placeholders in `index.html`

- `https://calendly.com/YOUR-LINK` — discovery-call booking link
- `https://tally.so/r/YOUR-FORM` — free sample report request form
- `hello@claritymetrics.org` — contact inbox
- `https://www.upwork.com/freelancers/YOUR-PROFILE` — Upwork profile

CTA clicks send a GA4 `cta_click` event with a `cta` parameter (see `data-track` attributes).

## Tech stack

**Reporting & BI**: Power BI Desktop, Power BI Service, Excel, Power Query, DAX
**Automation**: Zapier, Make, Power Automate, Python (pandas)
**AI & Insights**: OpenAI API, Claude API, custom prompt templates
**Data sources**: Salesforce, Shopify, QuickBooks, Stripe, Google Sheets, CSV/Excel
**Delivery**: SendGrid, Google Drive, OneDrive
**Client management**: Stripe, Calendly, Notion

## Deploy to GitHub Pages

1. Settings → Pages → Source: **Deploy from a branch** → `main` / root
2. Settings → Pages → Custom domain: `claritymetrics.org`

## File structure

```
/
├── index.html
├── README.md
└── dashboards/
    ├── ecommerce.html
    ├── agency.html
    ├── medspa.html
    ├── restaurant.html
    ├── fitness.html
    ├── realestate.html
    ├── saas.html
    └── salesforce.html
```
