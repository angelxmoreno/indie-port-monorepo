# IndiePort Dashboard — UI/UX Generation Prompt

## Product Overview

IndiePort is a portfolio platform for independent artists (photographers, musicians, video creators). Artists sign up with their phone number, connect social accounts (Instagram, TikTok, YouTube, Spotify, SoundCloud), and IndiePort automatically pulls their content into a beautiful, always-up-to-date portfolio website. No manual uploads, no drag-and-drop builders — connect once, and your portfolio stays synced.

The **dashboard** is the artist's control center: manage social connections, browse synced content, configure portfolio appearance, and upgrade their plan.

**Design direction:** Modern, warm, artist-friendly. Think Bandcamp meets Linear — clean layouts with personality. Not corporate, not sterile. Use soft shadows, rounded corners, and a muted-but-warm color palette (charcoal backgrounds optional — light mode first). Typography should feel editorial, not technical. The dashboard should feel like a creative tool, not an admin panel.

**Target user:** Independent artist who is not technical. They want to spend time creating, not configuring a website. Every interaction should be obvious and require zero explanation.

---

## Technical Constraints

- **React 19** + **Vite** + **React Router v7** (file-based routing NOT used — routes defined in `App.tsx`)
- **Tailwind CSS v4** + **shadcn/ui** for all components (Button, Card, Input, Dialog, Avatar, Badge, etc.)
- **Zustand** for auth state — already provided by `@indieport/shared-fe`
- **API client** — already provided by `@indieport/shared-fe` (`getApiClient()` returns typed `ApiClient`)
- **Mobile-first responsive** — sidebar collapses to bottom nav on mobile
- No server-side rendering for the dashboard — it's a pure SPA
- All data comes from the Hono API at `/api/*`, proxied to `http://localhost:3001` in dev via Vite config

---

## Auth State & API Integration

The dashboard uses these existing utilities from `@indieport/shared-fe`:

```tsx
import { useAuth, getApiClient } from '@indieport/shared-fe';

// Auth state hook
const { user, signOut } = useAuth();
// user: { userId: string; phone: string | null } | null

// API client (singleton, auto-attaches JWT)
const client = getApiClient();
if (!client) { /* not authenticated */ }

// Typed requests
const data = await client.request<ResponseType>('/api/endpoint');
// Throws ApiError on non-OK responses (with .status and .message)
```

**The `AuthenticatedUser` type currently only has `userId` and `phone`.** The dashboard will need the full artist record (plan, subdomain, themeId, customDomain). Assume a future `GET /api/me` response that includes the artist record, or a separate `GET /api/me/profile` endpoint. Design the UI to handle both states.

---

## Data Shapes

```tsx
interface Artist {
  id: string;
  userId: string;
  subdomain: string;          // e.g., "johnsmith" → johnsmith.indieport.com
  customDomain: string | null; // e.g., "johnsmith.com" (Pro only)
  themeId: string;
  plan: 'free' | 'pro';
  createdAt: string;
  modifiedAt: string;
}

interface Connection {
  id: string;
  provider: 'instagram' | 'tiktok' | 'youtube' | 'spotify' | 'soundcloud';
  scopes: string[];
  tokenExpiresAt: string | null;
  createdAt: string;
  modifiedAt: string;
}

interface ContentItem {
  id: string;
  provider: 'instagram' | 'tiktok' | 'youtube' | 'spotify' | 'soundcloud';
  category: 'image' | 'video' | 'music';
  externalId: string;
  url: string;
  thumbnailUrl: string | null;
  title: string | null;
  description: string | null;
  metadata: Record<string, unknown> | null;
  publishedAt: string | null;
  syncedAt: string;
}

interface AuthenticatedUser {
  userId: string;
  phone: string | null;
}
```

### API Endpoints

| Method | Path | Auth | Response |
|--------|------|------|----------|
| GET | `/api/me` | Required | Artist record (assume extended response) |
| GET | `/api/me/connections` | Required | `{ connections: Connection[] }` |
| GET | `/api/oauth/instagram` | Required | `{ authUrl: string }` |
| GET | `/api/oauth/instagram/callback` | Public | Redirect to dashboard with `?connected=true/false&error=...` |
| GET | `/api/me/content?category=image&provider=instagram` | Required | `{ items: ContentItem[] }` (assume this endpoint) |
| PATCH | `/api/me` | Required | Update artist record (subdomain, themeId, customDomain) |
| DELETE | `/api/me/connections/:id` | Required | Soft-delete connection (assume this endpoint) |

---

## Tier Gating Rules

| Feature | Free | Pro |
|---------|------|-----|
| Social connections | **2 max** | Unlimited |
| Custom domain | Locked | Unlocked |
| Themes | **2 basic** only | All themes |
| Content sync frequency | Every 24 hours | Every 1 hour |
| Portfolio analytics | Locked | Unlocked |

**UX for locked features:**
- Show the feature with a lock icon (🔒) or "Pro" badge
- On click/hover, show a brief tooltip: "Upgrade to Pro to unlock [feature name]"
- Upgrade CTA links to LemonSqueezy checkout (URL TBD, use `#` placeholder)
- Free-tier connection limit: when artist has 2 connections, remaining provider cards show "Upgrade to Pro" instead of "Connect"

**Plan badge in sidebar/header:** Show "Free" in muted gray or "Pro" with a subtle accent color.

---

## Layout Shell

### Desktop (≥1024px)

```
┌──────────┬──────────────────────────────────┐
│ Sidebar   │  Header (artist name, avatar,  │
│ 240px    │  plan badge, sign out)           │
│          ├──────────────────────────────────│
│ 🏠 Home  │                                  │
│ 🔗 Connect│  Main content area              │
│ 📄 Content│  (page content here)             │
│ ⚙️ Settings│                                │
│          │                                  │
│ ──────── │                                  │
│ Plan card │                                  │
│ (Free/Pro)│                                  │
└──────────┴──────────────────────────────────┘
```

### Mobile (<768px)

- Sidebar collapses to a **bottom navigation bar** with icons + labels
- Header becomes a compact top bar with avatar menu
- No persistent sidebar — full-width content

### Sidebar Details

- App logo/name at top: "IndiePort" with a small icon
- Nav items with icons (use Lucide React icons): Home, Link2, Image, Settings
- Active item highlighted with background color + left border accent
- Plan card at bottom showing current plan with upgrade CTA (if free)
- Collapsible on tablet (768–1023px): icons only, expand on hover

### Header Details

- Right side: artist avatar (initials circle), plan badge, "Sign out" button
- Optional: portfolio link ("View portfolio →") that opens `{subdomain}.indieport.com`

---

## Page Specifications

### 1. Login Page (`/login`)

**Already partially built.** Redesign with shadcn/ui components.

**Flow:**
1. Centered card on subtle gradient background
2. IndiePort logo at top
3. Phone number input with country code selector (or E.164 auto-format)
4. "Send code" button → disables, shows 60s countdown
5. OTP input (6 digit, auto-focus, paste-friendly)
6. "Verify" button
7. Error states: invalid phone, expired code, wrong code
8. Success → redirect to dashboard home

**Design notes:**
- Warm, inviting — not a typical SaaS login. Think creative tool signup.
- Illustration or subtle pattern behind the card (optional)
- "Your portfolio, always in sync" tagline below the logo

### 2. Dashboard Home (`/`)

**Overview page showing artist's portfolio at a glance.**

**Sections:**

1. **Welcome banner** — "Welcome back, {phone}" with a "View portfolio →" link
2. **Quick stats cards** (2x2 grid):
   - **Content items** — total count with category breakdown (X images, Y videos, Z tracks)
   - **Connected accounts** — count with provider icons (X of 2 free / ∞ pro)
   - **Last synced** — relative timestamp ("2 hours ago") or "Syncing..." indicator
   - **Portfolio status** — "{subdomain}.indieport.com" with a green dot (live) or setup prompt
3. **Recent content** — 4–6 thumbnail cards from the latest synced content, with a "View all →" link to Content page
4. **Quick actions** — row of action cards:
   - "Connect an account" (if connections < 2 or Pro)
   - "Customize theme" (link to Settings)
   - "Upgrade to Pro" (if free tier, with Pro badge)

**Empty state:** When no connections and no content:
- Large illustration/icon
- "Get started by connecting your first account"
- CTA buttons for each provider (Instagram first)

**Loading state:** Skeleton cards for all sections

### 3. Connections Page (`/connections`)

**Manage social account connections.**

**Layout:** Provider cards in a 2-column grid (1 column on mobile)

**Each provider card shows:**
- Provider icon + name (Instagram, TikTok, YouTube, Spotify, SoundCloud)
- **Connected state:**
  - Green checkmark + "Connected since {date}"
  - Scopes list (badges: "Basic", "Messages", "Comments", "Publish")
  - Token expiry indicator if < 7 days ("Expires in 3 days — click to reconnect")
  - "Disconnect" button (secondary, destructive on confirmation)
  - "Reconnect" button (if token expiring soon)
- **Disconnected state:**
  - Gray icon + "Not connected"
  - "Connect {Provider}" button (primary CTA)
- **Locked state** (free tier, already at 2 connections):
  - Lock icon overlay
  - "Upgrade to Pro to connect more accounts"
  - Upgrade CTA

**Disconnect flow:**
1. Click "Disconnect" → confirmation dialog: "Disconnect {Provider}? Your synced content will remain, but won't update."
2. Confirm → `DELETE /api/me/connections/:id` → refresh connections
3. Cancel → close dialog

**Connect flow (already implemented for Instagram, extend pattern):**
1. Click "Connect {Provider}" → `GET /api/oauth/{provider}` → get `{ authUrl }`
2. Redirect to `authUrl` (provider OAuth consent screen)
3. Provider redirects to `/api/oauth/{provider}/callback`
4. Callback redirects to `/settings/{provider}?connected=true` or `?connected=false&error=...`
5. Show success banner or error banner with message

### 4. Content Page (`/content`)

**Browse and filter synced content.**

**Layout:**

1. **Filter bar** (sticky top):
   - Category toggle: All | Images | Videos | Music (pill/tab selector)
   - Provider dropdown: All Providers | Instagram | TikTok | YouTube | Spotify | SoundCloud
   - Sort: Newest first | Oldest first
   - View toggle: Grid | List (grid default)

2. **Content grid** (3 columns desktop, 2 tablet, 1 mobile):
   - Each card shows:
     - Thumbnail (image/video: media thumbnail, music: album art or placeholder)
     - Title (first line of caption) — truncated to 2 lines
     - Provider badge (small icon, bottom-right of thumbnail)
     - Category icon overlay (📷 image, 🎬 video, 🎵 music)
     - Date (relative: "3 days ago")
   - On hover: scale up slightly, show "View original →" link (opens provider permalink)

3. **Empty state:**
   - "No content yet" with provider-specific CTA
   - "Connect {provider} to see your content here"

4. **Loading state:** Skeleton grid

5. **Pagination:** "Load more" button at bottom (infinite scroll optional)

**Content detail modal (on click):**
- Full-size image/video preview
- Title + full description
- Provider + external link
- Published date + sync date
- "View on {Provider}" external link
- "Hide from portfolio" toggle (future feature — show as disabled/coming soon)

### 5. Settings Page (`/settings`)

**Profile and portfolio configuration.**

**Sections (accordion or tab layout):**

#### Profile
- **Display name** — text input (saved to artist record, shown on portfolio)
- **Subdomain** — `{subdomain}.indieport.com` with inline edit + availability check
- **Portfolio URL** — read-only link with copy button

#### Theme
- **Theme picker** — card grid of available themes
  - Free: 2 themes shown, remaining shown as locked with Pro badge
  - Pro: all themes accessible
  - Each theme card: preview thumbnail + theme name
  - Selected theme highlighted with border accent
  - Hover: show enlarged preview
- **Custom domain** (Pro only)
  - Free: locked input with Pro badge, upgrade CTA
  - Pro: text input for domain + DNS instructions (expandable "Show DNS records" panel)

#### Plan & Billing
- **Current plan card:** Free or Pro
  - Free: shows feature comparison table, "Upgrade to Pro" primary CTA
  - Pro: shows "Pro plan active since {date}", "Manage billing" link
- **Feature comparison:**
  | Feature | Free | Pro |
  |---------|------|-----|
  | Social connections | 2 | Unlimited |
  | Custom domain | — | ✓ |
  | Themes | 2 | All |
  | Sync frequency | 24h | 1h |
  | Analytics | — | ✓ |

#### Danger Zone
- **Delete account** — destructive button with multi-step confirmation

---

## Interaction Patterns

### OAuth Connect Flow
1. User clicks "Connect {Provider}" on Connections page
2. Button shows spinner, calls `GET /api/oauth/{provider}` → `{ authUrl }`
3. `window.location.href = authUrl` (full redirect, not a popup)
4. Provider consent screen loads
5. Provider redirects to `/api/oauth/{provider}/callback?code=...&state=...`
6. API processes callback, redirects to `/settings/{provider}?connected=true` or `?connected=false&error=...`
7. Dashboard reads query params, shows success/error banner

### Tier Upgrade CTA
- Any locked feature click → show upgrade dialog/modal
- Modal content: feature name, brief benefit, Pro plan price (TBD, show "$X/month" placeholder), "Upgrade now" button
- "Upgrade now" links to LemonSqueezy checkout URL (placeholder `#`)

### Content Sync Status
- Dashboard home shows "Last synced: {relative time}" or "Syncing..."
- Connections page shows token expiry warning if < 7 days
- No manual sync button (sync is automatic via queue)

### Disconnect Confirmation
- Dialog title: "Disconnect {Provider}?"
- Body: "Your synced content will remain on your portfolio, but it won't update anymore."
- Buttons: "Cancel" (secondary) | "Disconnect" (destructive)
- After disconnect: refresh connections list, show toast "{Provider} disconnected"

### Theme Selection
- Click a theme card → instant preview (or selected state with "Apply" button)
- Free themes immediately applicable, locked themes show upgrade prompt on click
- After applying: brief toast "Theme updated"

---

## Component Inventory

Use these shadcn/ui components as the foundation:

- **Button** (primary, secondary, destructive, ghost, outline variants)
- **Card** (content cards, stat cards, provider cards, theme cards)
- **Dialog** (disconnect confirmation, upgrade prompt)
- **Input** (text fields, phone input)
- **Badge** (provider badges, plan badges, scope badges)
- **Avatar** (user initials circle)
- **Tabs** (settings page sections, content category filter)
- **Select** (provider dropdown, sort dropdown)
- **Skeleton** (loading states for all cards)
- **Tooltip** (locked feature explanations)
- **Separator** (sidebar dividers)
- **DropdownMenu** (avatar menu, sign out)
- **Toast/Sonner** (action confirmations: "Connected!", "Theme updated", "Disconnected")

---

## Color Palette Suggestion

Not prescriptive — the AI generator can interpret, but guide with:

- **Primary:** Warm indigo or deep purple (#6366f1 range) — creative, not corporate blue
- **Accent:** Amber/orange (#f59e0b range) — warmth, energy, CTA highlights
- **Background:** Near-white (#fafafa) — light mode default
- **Surface:** White (#ffffff) — cards, sidebar
- **Text primary:** Slate-900 (#0f172a)
- **Text secondary:** Slate-500 (#64748b)
- **Success:** Emerald-500 (#10b981)
- **Error:** Rose-500 (#f43f5e)
- **Pro badge:** Amber-500 (#f59e0b) with subtle glow

---

## File Structure

Generate components following this structure (but adapt as needed):

```
apps/dashboard/src/
├── App.tsx                    # Route definitions
├── components/
│   ├── layout/
│   │   ├── app-layout.tsx     # Sidebar + header shell
│   │   ├── sidebar.tsx        # Sidebar nav
│   │   ├── header.tsx         # Top bar
│   │   └── bottom-nav.tsx     # Mobile bottom nav
│   ├── ui/                    # shadcn/ui components (auto-generated)
│   └── shared/
│       ├── plan-badge.tsx     # Free/Pro badge
│       ├── provider-icon.tsx  # Provider logo/icon component
│       └── upgrade-modal.tsx  # Pro upgrade CTA modal
├── pages/
│   ├── login-page.tsx
│   ├── dashboard-page.tsx     # Home
│   ├── connections-page.tsx
│   ├── content-page.tsx
│   └── settings-page.tsx
├── hooks/
│   ├── use-auth.ts            # Re-export from shared-fe
│   └── use-connections.ts     # Fetch/manage connections
└── lib/
    └── api.ts                 # Re-export getApiClient from shared-fe
```

---

## Responsive Breakpoints

| Breakpoint | Sidebar | Content columns | Navigation |
|------------|---------|-----------------|------------|
| <640px | Hidden | 1 column | Bottom nav |
| 640–767px | Hidden | 2 columns | Bottom nav |
| 768–1023px | Icons only (collapsed) | 2 columns | Sidebar icons |
| ≥1024px | Full sidebar (240px) | 3 columns | Sidebar full |

---

## Empty States

Every page must have a purposeful empty state, not just a blank screen:

- **Dashboard:** "Get started by connecting your first account" with provider buttons
- **Connections:** "Connect a social account to automatically import your content"
- **Content:** "No content yet. Connect an account to see your content here."
- **Settings — Themes:** "Choose a theme for your portfolio" (2 themes visible for free)

---

## Loading States

Use shadcn/ui `<Skeleton />` components for all data-fetching pages:
- Stat cards: 4 skeleton rectangles
- Content grid: 6–9 skeleton image cards
- Connection cards: 2–5 skeleton provider cards
- Settings: skeleton form fields

Show skeletons for 300ms+ fetches (instant for cached data).

---

## Accessibility

- All interactive elements keyboard-navigable
- Color contrast meets WCAG AA (4.5:1 for text, 3:1 for large text/UI)
- Screen reader labels on icons and status indicators
- Focus rings on all interactive elements (shadcn default)
- No information conveyed by color alone (always pair with icon or text)

---

## Animation

Subtle, purposeful only:
- Page transitions: fade in (150ms)
- Card hover: slight scale (1.02) + shadow elevation
- Sidebar nav active state: slide-in left border accent
- Toast: slide in from top-right, auto-dismiss 4s
- Theme card hover: preview zoom
- No decorative animations — every animation serves feedback or hierarchy