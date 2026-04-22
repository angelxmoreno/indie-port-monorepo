# Provider Decisions

## First Provider: Instagram

Instagram was chosen as the first provider over TikTok because:

- **API stability** — Meta Graph API is mature, well-documented, and rarely makes breaking changes
- **Token management** — Long-lived tokens last 60 days with straightforward refresh
- **Rate limits** — Generous (200 calls/user/hour)
- **Content access** — Photos, videos (Reels), and stories are accessible via Graph API
- **Client confidence** — Lower risk of API breakage for the first client

## Provider Evaluation

| Provider | API Maturity | Content Access | Rate Limits | Risk |
|----------|-------------|----------------|-------------|------|
| Instagram | High | Good (photos, reels, stories) | 200/user/hr | Low |
| TikTok | Medium | Restricted (needs approval) | Strict | Medium-High |
| YouTube | High | Good (videos, shorts) | Generous (quota system) | Low |
| Spotify | High | Good (tracks, albums) | Generous | Low |
| SoundCloud | Low-Medium | Limited | Strict | Medium |

## Implementation Order (Planned)

1. Instagram (first client priority)
2. TBD — to be decided based on client demand