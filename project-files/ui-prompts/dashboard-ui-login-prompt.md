# IndiePort Login Page — Detailed Spec

> **Context:** You already have the full dashboard spec (`dashboard-ui-prompt.md`). This document provides the detailed implementation spec for the **login page** — the first page to build. All technical constraints, color palette, component library (shadcn/ui + Tailwind), and design direction from the dashboard spec apply here. This page does **not** use the sidebar layout — it's a standalone full-screen auth page.

---

## What Makes This Page Different

Phone OTP is the **only** auth method. No email, no password, no social login. One flow: enter phone → receive code → verify. The login page is both signup and sign-in — there are no separate flows. This is a core product decision, not a limitation.

The page should feel like walking into a creative studio, not filling out a form. Warm, calm, focused. One task at a time. Zero decision fatigue.

---

## Auth Flow (2 Steps)

### Step 1: Phone Input

1. User enters phone number
2. Client parses with `libphonenumber-js` (`parsePhoneNumberFromString`, default country `US`)
3. Converts to E.164 via `formatToE164()`
4. Validates against Zod schema `phoneLoginRequestSchema` from `@indieport/shared-types`
5. Calls `signInWithOtp(e164)` from `useAuth()` — delegates to Supabase
6. Success → transitions to Step 2
7. Error → inline error message

### Step 2: OTP Verification

1. "Code sent to **{formatted phone}**" with resend link
2. User enters 6-digit code
3. Validates against `otpVerifyRequestSchema`
4. Calls `verifyOtp(e164, token)` from `useAuth()`
5. Success → `syncUserFromApi()` runs automatically → redirect to `/` (dashboard home)
6. Error → inline error message
7. "Back" link returns to Step 1 (clears code, keeps phone)

### Existing Code to Preserve

The current `login-page.tsx` already handles: phone parsing with `libphonenumber-js`, Zod validation, two-step state management, loading states, and `useAuth()` integration. Preserve all of this logic — the redesign replaces the UI layer (inline styles → shadcn/ui + Tailwind) and adds UX enhancements (OTP auto-advance, resend countdown, animations).

### Existing Hooks/Utils

```tsx
import { useAuth } from '@indieport/shared-fe';
import { otpVerifyRequestSchema, phoneLoginRequestSchema } from '@indieport/shared-types';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

// Auth state shape (from Zustand store):
interface AuthState {
  user: AuthenticatedUser | null;  // { userId: string; phone: string | null }
  accessToken: string | null;
  isLoading: boolean;
  signInWithOtp: (phone: string) => Promise<void>;
  verifyOtp: (phone: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
}

// Phone utilities (move from login-page.tsx to lib/phone.ts):
const DEFAULT_COUNTRY = 'US';
function formatToE164(input: string): string | null {
  const parsed = parsePhoneNumberFromString(input, DEFAULT_COUNTRY);
  if (!parsed?.isValid()) return null;
  return parsed.format('E.164');
}
function formatDisplay(input: string): string {
  const parsed = parsePhoneNumberFromString(input, DEFAULT_COUNTRY);
  return parsed?.formatNational() ?? input;
}
```

---

## Layout

### Desktop (≥768px)

Centered card on a subtle warm gradient background. `max-w-md` (448px). Generous vertical padding.

```
┌───────────────────────────────────────────────┐
│                                               │
│          [warm gradient background]           │
│                                               │
│        ┌───────────────────────┐              │
│        │   IndiePort          │              │
│        │   Your portfolio,     │              │
│        │   always in sync     │              │
│        │                       │              │
│        │  ┌─────────────────┐  │              │
│        │  │ Phone input      │  │              │
│        │  └─────────────────┘  │              │
│        │                       │              │
│        │  [Send verification]  │              │
│        │                       │              │
│        │  -- or Step 2 --      │              │
│        │                       │              │
│        │  Code sent to         │              │
│        │  **(347) 980-9243**   │              │
│        │                       │              │
│        │  ┌───┐┌───┐┌───┐┌───┐┌───┐┌───┐   │              │
│        │  │ • ││ • ││ • ││ • ││ • ││ • │   │              │
│        │  └───┘└───┘└───┘└───┘└───┘└───┘   │              │
│        │                       │              │
│        │  [Verify]             │              │
│        │  [Back]  Resend       │              │
│        └───────────────────────┘              │
│                                               │
└───────────────────────────────────────────────┘
```

### Mobile (<768px)

Full-width card, `px-4`, no background gradient — clean white/light gray.

```
┌─────────────────────┐
│                     │
│   IndiePort         │
│   Your portfolio,   │
│   always in sync    │
│                     │
│  ┌────────────────┐ │
│  │ Phone input    │ │
│  └────────────────┘ │
│                     │
│  [Send code]        │
│                     │
└─────────────────────┘
```

---

## Component Details

### Login Card

- Centered vertically and horizontally on desktop
- `max-w-md`, `rounded-2xl`, `shadow-lg`
- White background, `px-8 py-10` desktop, `px-6 py-8` mobile
- Subtle card border (`border border-slate-200`)

### Brand Header

- "IndiePort" wordmark — `text-2xl font-bold`, warm indigo color (`text-indigo-600`)
- Small accent dot or gradient bar above or beside the logo (amber `#fbbf24`)
- Tagline: "Your portfolio, always in sync" — `text-sm text-slate-500`, `mt-1`
- Centered, `mb-8` below tagline

### Phone Input (Step 1)

- shadcn/ui `<Input>` component
- Type: `tel`, `autocomplete="tel"`, `inputMode="tel"`
- Placeholder: `(347) 980-9243`
- Country prefix: `+1` shown as a fixed prefix badge inside the input (for MVP, US only)
- Auto-format on blur: call `formatDisplay()`, store raw value in state
- Validation error: red border (`ring-2 ring-rose-500`) + error text below
- Error message: "Please enter a valid phone number"
- Label: visually hidden but present for screen readers

### OTP Input (Step 2)

- **6 individual single-character inputs** — not one long input
- Each: `w-12 h-14 text-center text-xl font-bold`
- Auto-advance: focus next box on digit entry
- Auto-submit: when all 6 digits filled, call verify automatically (no need to click Verify)
- Paste support: detect 6-digit paste, split across all boxes
- Backspace: clear current box, move focus to previous
- Active box: `ring-2 ring-indigo-500`, slight scale (`scale-1.05`)
- Above inputs: "We sent a code to **{formatted phone}**"
- Below inputs: "Resend" link (muted, `text-sm`) with 60s countdown timer after send
- "Back" link (muted) — returns to phone input, keeps phone, clears code

### Primary Button

- shadcn/ui `<Button>`, default variant, `w-full`
- Step 1: "Send verification code"
- Step 2: "Verify"
- Loading: spinner replaces text, button stays same width
- Disabled: `bg-slate-100 text-slate-400 cursor-not-allowed`

### Error Messages

- `text-sm text-rose-500`, `mt-2`, fade-in (150ms)
- Specific messages:
  - "Please enter a valid phone number" (invalid format)
  - "Failed to send verification code. Please try again." (OTP send failure)
  - "Invalid verification code" (wrong OTP)
  - "Verification failed. Please try again." (generic)
  - "Too many attempts. Please wait before trying again." (rate limited)
  - "Connection failed. Check your internet and try again." (network error)
  - "Code expired. Resend a new code." (expired OTP)
- `aria-live="polite"` on error container for screen readers

### Success Transition

- After successful verification: brief green checkmark + "Verified!" (300ms)
- Then redirect to `/` via `useNavigate()`

### Initial Loading State

- When `isLoading` is true on page load (session check): centered spinner, no card content
- When `isLoading` resolves to `false` with a user: `<ProtectedRoute>` redirects to `/`
- When `isLoading` resolves to `false` with no user: show the login card

---

## Animations

Minimal and purposeful:

- **Card entrance:** fade in + `translateY(8px)` → `translateY(0)` (200ms, ease-out)
- **Step transition:** crossfade between phone input and OTP input (200ms)
- **Error shake:** input shakes horizontally (200ms, 8px amplitude)
- **OTP focus:** subtle scale on active box (1.05)
- **Button loading:** spinner replaces text, button width stays constant
- No decorative animations

---

## Colors (Login-Specific)

These extend the dashboard palette — warm, creative, not corporate:

- **Page background:** `#faf9f7` (warm off-white) or subtle gradient from warm gray to white
- **Card background:** `#ffffff`
- **Primary button:** `#6366f1` (indigo-500) → hover `#4f46e5` (indigo-600)
- **OTP input border:** slate-300 default, indigo-500 focus, rose-500 error
- **Error text:** rose-500 (`#f43f5e`)
- **Muted text:** slate-500 (`#64748b`)
- **Brand accent:** amber-400 (`#fbbf24`) for the dot/accent

---

## Accessibility

- All inputs have `<label>` elements (visually hidden acceptable, but present in DOM)
- OTP inputs: `aria-label="Digit 1 of 6"` through `"Digit 6 of 6"`
- Phone input: `aria-label="Phone number"`
- Error messages: `aria-live="polite"` — screen readers announce errors
- Loading buttons: `aria-disabled="true"` with `aria-busy="true"`, not just `disabled`
- Focus management: after OTP send → auto-focus first digit; after error → focus relevant input
- Color contrast: all text meets WCAG AA (4.5:1 on white)

---

## Mobile Behavior

- Phone input triggers numeric keyboard (`inputMode="tel"`)
- OTP inputs trigger numeric keyboard (`inputMode="numeric"`, `pattern="[0-9]*"`)
- No scroll needed — card fits viewport on ≥375px screens
- Respect `env(safe-area-inset-*)` for notch devices
- Don't autofocus on mobile (keyboard covers the view) — autofocus on desktop only

---

## Edge Cases

| Case | Behavior |
|------|----------|
| Expired OTP | Show "Code expired. Resend a new code." with resend link |
| Too many attempts | Show rate limit message, disable inputs for cooldown |
| Invalid phone format | Client-side validation catches before API call |
| Network error | Show "Connection failed. Check your internet and try again." |
| Already authenticated | `ProtectedRoute` redirects to `/` |
| Browser autofill | Phone input supports `autocomplete="tel"` |
| Back button after OTP sent | Return to phone input, clear code, keep phone number |
| Paste 6-digit code | Split across all 6 OTP boxes |

---

## What NOT to Include

- No email/password fields
- No "Sign up" vs "Log in" tabs — phone OTP is both
- No social login buttons (Google, Apple, etc.)
- No "Forgot password" link (no passwords exist)
- No CAPTCHA (Supabase handles bot protection)
- No terms of service checkbox on login (defer to first dashboard visit)

---

## File Structure

```
apps/dashboard/src/
├── components/
│   ├── ui/              # shadcn/ui (button, input, etc.)
│   └── auth/
│       └── otp-input.tsx    # 6-digit input with auto-advance + paste
├── pages/
│   └── login-page.tsx       # Main login page (replaces existing)
└── lib/
    └── phone.ts              # formatToE164, formatDisplay (extracted from login-page.tsx)
```

---

## Implementation Notes

- **Extract phone utilities** from `login-page.tsx` into `lib/phone.ts` — they'll be reused by other pages
- **Build `OtpInput` as a standalone component** — it's complex enough to warrant isolation (6-box auto-advance, paste handling, backspace navigation)
- **Use `useAuth()` as-is** — don't modify the Zustand store. The hook already handles Supabase session management and API sync
- **Route is `/login`** — defined in `App.tsx`, outside `<ProtectedRoute>`
- **After successful auth**, `useAuth()` calls `syncUserFromApi()` which hits `GET /api/me` and populates the user state. The redirect to `/` happens after this completes
- **The `ProtectedRoute` component** already handles redirect logic — if `isLoading` is true, show a spinner; if no user, redirect to `/login`; if user exists, render children