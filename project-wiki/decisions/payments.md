# Payment Provider: LemonSqueezy

## Decision

LemonSqueezy chosen as Merchant of Record over Stripe and Paddle.

## Reasoning

- **Tax compliance** — Handles global tax calculation, collection, and remittance across 200+ countries. This is the biggest value add for a small team.
- **Invoicing** — Automatic invoice generation and delivery
- **Chargebacks** — Handled by LemonSqueezy as MoR
- **Developer experience** — Modern API, good webhooks, clean dashboard
- **Setup effort** — Low compared to Stripe (which requires building tax/compliance yourself)

## Fee Structure

- 5% + 50¢ per transaction
- Worth the premium vs. Stripe's 2.9% + 30¢ when factoring in tax compliance overhead

## Monetization Tiers

| Feature | Free | Pro |
|---------|------|-----|
| Social connections | 2 | Unlimited |
| Custom domain | No | Yes |
| Themes | 2 basic | All |
| Content sync frequency | 24h | 1h |
| Portfolio analytics | No | Yes |