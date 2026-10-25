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

## Links

- Contact email: mpworksmail@gmail.com
- Intro-call booking page: https://calendar.app.google/KnHmZs9JgbYsxABm7
- Free sample report form: https://docs.google.com/forms/d/e/1FAIpQLSc0dXNBsj9K7-znDn830K0JFKeagQi5aXgK31ySsuwCx91gew/viewform
- Client onboarding form (Stripe redirect after payment): https://docs.google.com/forms/d/e/1FAIpQLScOpi4y4RGcqPeKxCAgT6JciUGQq15-y0euKxTlSmipBehsfg/viewform

## Still to replace in `index.html`

- `https://www.upwork.com/freelancers/YOUR-PROFILE` — Upwork profile

CTA clicks send a GA4 `cta_click` event with a `cta` parameter (see `data-track` attributes).

## Tech stack

**Reporting & BI**: Power BI Desktop, Power BI Service, Excel, Power Query, DAX
**Automation**: Google Apps Script (`claritymetrics-automation.gs`), Power Automate, Python (pandas)
**AI & Insights**: OpenAI API, Claude API, custom prompt templates
**Data sources**: Salesforce, Shopify, QuickBooks, Stripe, Google Sheets, CSV/Excel
**Delivery**: Power BI email subscriptions, Gmail, Google Drive
**Client management**: Stripe Payment Links, Google Calendar booking page, Google Forms + Sheets

## Deploy to GitHub Pages

1. Settings → Pages → Source: **Deploy from a branch** → `main` / root
2. Settings → Pages → Custom domain: `claritymetrics.org`

## File structure

```
/
├── index.html
├── README.md
├── claritymetrics-automation.gs   (paste into Apps Script; not served by the site)
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
