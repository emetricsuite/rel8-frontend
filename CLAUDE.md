# Rel8 Members Portal — CLAUDE.md

The member-facing app: dues, events, elections, projects, services, chat, profile.
Served at `app.rel8.ng` (or whatever `FRONTEND_URL` is on the backend).

> **Standalone clients (from 2026-11-04):** Yayi, then Hamzat, get their own deployment of
> this portal. Phases, decisions and timeline are in the backend CLAUDE.md, "Standalone
> clients". This repo's part is the SA-0 logo refresh and SA-4.

> 🎨 **A full visual redesign is in flight — read [`REDESIGN.md`](./REDESIGN.md) before
> touching any UI.** It carries the design tokens, the shared primitives in
> `src/components/ui/`, the module-by-module plan and a "Resume here" section with the
> current state: **complete — M0 through M15 all done.** The applicant portal and member
> support tickets are built too. What is left is a live-tenant eyeball, not redesign work.
> This file still governs stack rules, payment architecture and status vocabulary —
> none of which the redesign changes.

**Before building any screen, check the backend and the admin** — this app is older than
both and still calls routes they renamed or deleted. `REDESIGN.md` §0b has the checklist;
the short version is that `rel8-backend-nordjs-2025/src/app.js` decides what exists, and
`rel8-admin-version-2/src/services/api/` shows how it is meant to be consumed.

Sibling repos, each with its own CLAUDE.md:

- `C:\Users\offic\documents\rel8-backend-nordjs-2025` — the API. **Read its CLAUDE.md**;
  it carries the master TODO list and the payment architecture.
- `C:\Users\offic\documents\rel8-admin-version-2` — admin dashboard
- `C:\Users\offic\documents\rel8-website-2025` — per-tenant public website

---

## Commands

```bash
npm run dev      # vite --port 4000
npm run build    # tsc && vite build   <- the correctness gate
npm run lint     # eslint, --max-warnings 0
npm run preview
```

No tests. `npx tsc --noEmit` is the fast check; `npm run build` is the real one.

## Stack

This app is **older than its siblings** — do not assume their conventions apply:

- React **18** (not 19)
- **`react-query` v3** — the legacy package, not `@tanstack/react-query` v5.
  `useQuery(key, fn, opts)` positional form, `useMutation(fn, opts)`, `isLoading`
  (not `isPending`). Do not copy hook code from the admin repo.
- Tailwind (no Chakra), `react-hook-form` + **yup** (not zod)
- `react-router-dom` v6, `react-toastify` via a local `Toast()` wrapper
- axios via `src/api/baseApi.ts`

## Layout

```
src/
  api/          one folder per resource; baseApi.ts holds the axios instances
  components/   shared UI (button/, form/, loaders/, toast/, payments/)
  pages/        auth/ and dashboard/<feature>/
```

`src/api/baseApi.ts` exports `apiTenant` (JSON) and `apiTenantAxiosForm` (multipart).
Use the form instance for anything with a file.

## Payments — read before touching money code

All five payment domains are unified (backend `X-1`/`X-7`). **`src/api/paystack-api.ts`
is the single entry point** — despite the filename it now covers both tiers, not just
Paystack.

The old generic `POST /api/paystack/initialize/:type/:id` is **410 Gone**. Each domain
starts payment at its own endpoint, because each needs domain knowledge that initializer
never had:

| domain | start | declare a transfer |
|---|---|---|
| Due | `startDuePayment(dueId, method?)` | `declareDuePayment(dueId, {proof?, note?})` |
| Event | `startEventRegistration(eventId)` | `declareEventPayment(registrationId, …)` |
| Project | `startProjectContribution({...})` | `declareProjectContribution(id, …)` |
| Service | `startServiceRequest({...})` | `declareServicePayment(requestId, …)` |

Every start returns the same `checkout`:

```ts
{ method: "paystack",      authorizationUrl, reference }      // redirect the payer
{ method: "bank_transfer", reference, amount, bankTransfer }  // show the details
```

The member-facing dues screen is **one component**, `pages/dashboard/dues/DuesPanel.tsx`,
used by both `DuesPage` and the Account page's Payments tab. Those were separate copies that
declared transfers differently; do not fork them again.

Render the second case with **`components/payments/BankTransferPanel`** — it handles the
account details, copy-to-clipboard, the optional proof upload and the declare call. Do not
hand-roll another one.

### Two rules that are easy to get wrong

1. **Proof is optional.** Only require it when the item's
   `paymentConfig.bankTransfer.requireProof` is set. Most associations reconcile from
   their own bank statement; demanding a receipt just loses payers.
2. **Bank details are never shown before a payment exists.** They arrive with a generated
   reference, which is the only thing that lets an admin match the transfer to this
   member. Showing a bare account number up front (as this app used to) produces
   unattributable payments.

### Status vocabulary

One enum everywhere — `PAYMENT_STATUS_LABEL` in `paystack-api.ts` has the display strings:

`pending` → `awaiting_verification` → `paid` | `failed` | `rejected` | `cancelled`

Plus `unpaid` (a due nobody has started paying) and `free`. Legacy values (`approved`,
`awaiting-confirmation`, `confirmed`) are still tolerated in status maps because rows
predating the migration can still carry them.

**Two statuses are NOT payment statuses** and must not be folded in:
`ServiceRequest.requestStatus` (fulfilment: confirmed → dispatched → completed) and
`ProjectContribution.status` (in-kind verification only — cash uses `paymentStatus`).

### Events pricing

**An event has no `name` field — the title is `details`.** The backend's own
`getEventStats` reads `eventTitle: "$event.details"`. `event.name || event.details` appears
in old call sites and only ever worked because `name` is undefined. Accessors live in
`src/pages/dashboard/events/eventFields.ts`.

`event.isPaid` / `event.price` are gone. Use `event.pricing`:
`memberAmount` when the admin set a member discount, else `amount`. `paymentConfig.methods`
empty ⇒ free. A registration can now be `pending_payment` — a place held while checkout is
in flight, which does **not** count toward capacity.

## Notifications

`Notification` carries a **`type`** (`event|meeting|due|election|news|publication|general`)
and a `refId`. Any new producer must set both — the type drives what members can mute
(`Member.notificationPreferences`, filtered server-side in `notification.controller.js`) and
`refId` is what lets a row link to the thing it is about.

`general` is the fallback for anything unclassified and is deliberately not mutable.

## Credentials

A member's certificate or ID card is a **published `CredentialTemplate` plus their values**,
resolved on request by `GET /api/credentials/my?category=…`. There is no issued-credential
collection by design: the template's `variable` elements are substituted at render time, so
a re-brand reaches every member with no reissue step. Rendering lives in
`components/credentials/CredentialCanvas.tsx`.

## Password recovery

`POST /api/members/forgot-password` sends a link whose destination depends on
`settings.magic_link`: a password organization gets `/setup-new-password?token=`
(→ `POST /members/set-password`), a passwordless one gets `/authentication?token=`. It used
to send everyone to `/authentication`, so forgot-password signed you in without ever
changing the password — see the backend's BE-40.

`POST /members/reset-password/:token` exists but is deliberately **not** used: it skips the
`userType` check and does not mark the member verified. Set passwords through
`setPassword`.

## Support tickets

Members raise and track tickets at Support → My Tickets (`api/tickets/tickets-api.ts`).
Support types and categories are **verbatim copies of the admin's `libs/constant.ts`** and
must stay that way — both apps write the same `Ticket.category` / `supportType` enums, and
a divergence means members file tickets that fall outside the admin's filters.
`ticket.routes.js` is `requireOrgAdminOrMember`, so the portal client deliberately exposes
only read + create — status changes and deletion are the admin's, and `getMyTickets` scopes
the list server-side. The Admin/Technical Support contact forms create tickets through the
same resource.

## There is no registration

A member is created by an admin, or by an admin approving a membership application. They are
emailed a link, set a password, and log in. **There is no self-registration**, and the
screens that implemented one (`RegistrationPage`, `VerifyMemberPage`) posted to Django-era
routes this backend never mounted. They were deleted in M14 — do not rebuild them.

The one self-service path in is the public **application** form; see below.

## Membership applications — the applicant portal

The portal hosts **two public routes that have nothing to do with a member session**:

- `/track` — an applicant enters their application ID + the email they applied with
- `/application` — the status page, behind `ApplicantLayout` (logo-only rail, one nav item)

Neither may go inside `DashboardLayout`, which requires a logged-in member and would bounce
them to `/login`. They use `apiPublic`, not `apiTenant`, for the same reason.

The tracked application is cached in **`sessionStorage`** (`pages/applicant/trackedApplication.ts`)
rather than the URL — a code and email in a URL end up in history, bookmarks and
screenshots. It is a cache of an authorised lookup, never the authorisation: the status page
re-fetches on mount.

This is the applicant shell REDESIGN.md M1 deferred as "blocked on the backend". The block
was real for an authenticated endpoint; the portal turned out to be a public code lookup.
Backend: `rel8-backend-nordjs-2025` BE-39.

## Environments — one model, not three

Groups, committees and excos are **one backend resource**, `Environment`, discriminated by
`environmentType: "exco" | "committee" | "general"`. The admin app already dropped its
standalone Exco and Committee screens; this portal has not caught up, so
`/api/excos`, `/api/committees` and `/api/groups` are all **unmounted** and every client
calling them can only 404. Use `/api/environments` (`src/api/environments/environments-api.ts`).
Full breakdown, including which files die and which only need repointing, is in
`REDESIGN.md` §0c.

**Content bodies are rich HTML**, written in the admin's editor — headings, lists, bold,
`&nbsp;` entities. Never print one as a text node and never strip it with a tag regex:

- rendering → `<RichText html={...} />` (`utils/richText.tsx`), which sanitises with
  DOMPurify and supplies the typography Tailwind's preflight strips
- excerpts, search, `line-clamp` → `htmlToText()` (`utils/html.ts`), which parses with
  `DOMParser` so entities decode

`unformatText()` in `utils/strings.ts` is a bare `replace(/<[^>]*>/g, "")`: it leaves
`&nbsp;` behind and is not for article bodies.

**Content field names**: News is `topic` / `content` (no `name`, no `body`); Publication is
`title` / `content`; Gallery is `images: [{url, caption}]`. `likes` / `dislikes` are arrays
of member ids, so the count is the length. Accessors:
`src/pages/dashboard/content/contentFields.ts`.

**Chat lives inside an Environment.** There is no standalone Chat page — `Environment.hasChat`
gates it, `EnvironmentMessage` stores it, and the socket protocol is keyed on
`environmentId` (`joinEnvironment` / `environmentMessage`, *not* the old `joinGroup` /
`groupMessage`). The UI is `pages/dashboard/environment/EnvironmentChatTab.tsx`.

Two member fields that are not the same thing: **`Member.status`**
(`active`/`inactive`/`suspended`/`pending`) is membership standing and is what the
Active/Inactive chip shows; **`Member.isActive`** is account deactivation, paired with
`deactivationReason` / `deactivatedAt`.

## Voting

Four of the six election pages were static mocks with no data layer and were deleted in M8
(`ElectionAllVotes`, `ElectionContestantDetailPage`, `ElectionStepsPage`,
`ElectionCreateAspirantPage`). What remains is the list and the detail/vote/results page.
`getElections` returns a server-computed `status` and `stats.turnout` — never recompute the
election window in the browser.

One vote per **member per position** (backend `BE-2`/`BE-3`, enforced by a unique index).
`ElectionDetailsPage` computes `hasVotedInCurrentPosition` and disables every candidate in
a position once one is chosen. A 409 from `castVote` means the server already has a vote
for that position — sync the UI rather than surfacing a bare error.

---

## Global search

The topbar field is live (2026-08-24). It used to be `<input disabled>` with a comment
saying the backend had no search endpoint; `GET /api/search` now exists.

```
src/api/search/search-api.ts          the call + the response types
src/utils/searchDestinations.ts       type -> route in THIS client
src/components/navigation/GlobalSearch.tsx
```

One endpoint serves all three clients (admin dashboard, this portal, the mobile app), so it
returns `type` + `id` and **no URL** — the same record opens somewhere different in each.
`searchDestinations.ts` is this client's half of that; the admin's is `src/types/search.ts`
and the app's is `src/constants/search.ts`. Keep the three in step when a route moves.

Two things the backend already handles, so do not re-implement them here:

- **Audience scoping.** A member's results are filtered by the same `getAudienceFilter` the
  list endpoints use, so search never surfaces an environment's content to someone outside
  it. Tickets come back scoped to the member's own.
- **Which types exist.** `SEARCHABLE_TYPES` is sent as `?types=`, and it is derived from the
  destination map — a type this portal cannot open is never requested. Minutes are the only
  one currently excluded (no screen for them).

## Sessions — read before touching auth

The session lives under one localStorage key, `rel8User` (`{...member, token}`), and **one
module decides what it means: `src/utils/session.ts`**. Nothing else should parse that key
by hand — the two axios instances, the sidebar, the chat panels and `extra_functions` each
used to keep their own copy of that parse, with different ideas about what a missing or
malformed value meant.

```
src/utils/session.ts             read/write/clear, JWT expiry, the intended-path handoff
src/context/authContext.tsx      the React-visible session: user, isAuthenticated, logout
src/components/auth/guards.tsx   <RequireAuth> and <GuestOnly>
```

Rules:

- **`isAuthenticated`, never `!!user`.** `user` is also truthy mid-logout and falsy while a
  profile refetch is in flight.
- **Read storage in the initial state, never in an effect.** This was the session-persistence
  bug: `AppProvider` filled `user` from a `useEffect`, and effects run child-first, so
  `DashboardLayout`'s "no user → /login" check ran a full tick before the provider had
  looked at localStorage. Every hard refresh of a dashboard page bounced a logged-in member
  to the login screen.
- **`DashboardLayout` is `<RequireAuth>` wrapping `DashboardShell`.** The split matters: the
  shell's org-settings query has no `enabled` guard, and letting it fire while signed out
  produced a guaranteed 401 on the way to the login screen.
- `/login` and `/forgot-password` are wrapped in `<GuestOnly>`. `/setup-new-password` and
  `/authentication` are **not** — they carry a one-time token from an email and must work in
  any session state.
- **Log out through `logout()` from the context**, which clears storage *and*
  `queryClient.clear()`. `/logout` is a real page (`pages/auth/LogoutPage`); it used to
  render `LoginPage` and clear nothing.
- A 401 on either axios instance clears the session, remembers the path in `sessionStorage`
  and `window.location.replace("/login")`. The redirect had been commented out, which is why
  an expired session showed a dashboard where every panel silently failed.

## Mobile

The redesign is responsive by construction — grids carry `sm:`/`lg:` steps and content
columns carry `min-w-0`. Three things are worth knowing when adding screens:

- **`<Table>` is not a table on a phone.** Below `md` each row renders as a stacked card of
  label/value pairs. Mark the heading cell with `primary: true` (defaults to the first
  column), drop filler columns with `hideOnMobile`, and give an action column
  `mobileFullWidth: true` so its buttons get the whole card width. `keepTableOnMobile` opts
  out, for a genuinely comparative grid. The admin's `DataTable` now follows the same
  contract, so the two stay recognisable to each other.
- **Watch the flex axis when a row stacks.** `SearchFilterBar` is `flex-col sm:flex-row`,
  and a bare `flex-1` on a child means `flex-basis: 0%` on the **height** while it is a
  column — which beat `h-12` and collapsed the search pill to the height of its own text.
  Use `sm:flex-1`, not `flex-1`, on anything with a fixed height inside a bar that stacks.
- **Fields are forced to 16px on coarse pointers** (bottom of `index.css`). Safari zooms the
  viewport on any focused field under 16px and never zooms back out — that single rule is
  most of what "the app isn't responsive on my phone" meant.
- **Two-pane screens show one pane at a time.** `EnvironmentChatTab` is the pattern: the room
  list and the conversation are separate screens below `md`, with a back arrow in the
  conversation header (`onBack` on `EnvironmentPanel` / `PrivatePanel`).

## TODOs

Legend: `[ ]` open · `[x]` done. IDs shared with the sibling repos (`MP-*` = portal only).

- [x] **MP-8 · Session persistence was broken in four places.**
  A refresh on any dashboard page bounced a logged-in member to `/login`; an authenticated
  member could still open `/login` and `/forgot-password`; `/logout` rendered the login page
  without clearing anything; and the 401 redirect in `baseApi.ts` was commented out, so an
  expired session showed a dashboard where every panel silently failed. Token expiry was
  never checked at all.
  **RESOLVED (2026-08-22):** `utils/session.ts`, `components/auth/guards.tsx`, a real
  `LogoutPage`, `AppProvider` rewritten to hydrate synchronously and expose
  `isAuthenticated` / `logout`, both axios instances sharing one `attachSession` and one 401
  path. See "Sessions" above.

- [x] **MP-9 · Mobile refinements.**
  **RESOLVED (2026-08-22):** `<Table>` renders stacked cards below `md` (it was a 720px
  grid inside a horizontal scroller, hiding status and actions behind a swipe); 16px fields
  on touch screens; the chat tab shows one pane at a time instead of a 240px room rail
  beside a 135px conversation; the sidebar drawer locks body scroll, closes on Escape and on
  navigation, and clears the iOS home indicator; the membership card scales to fit instead
  of forcing a 340px card through a ~295px column; tab strips bleed to the screen edge with
  the scrollbar hidden; filter selects go full width when the search bar stacks.

- [ ] **MP-10 · There is no application-fee payment UI on the public website.**
  An applicant cannot pay a fee themselves — only events have a public payment path. Carried
  over from the admin repo's `FE-17`.

- [x] **X-1 / X-7 (portal side) · Migrate onto the unified payment layer.**
  **RESOLVED (2026-08-18):** `paystack-api.ts` rewritten; new
  `components/payments/BankTransferPanel`; `DuesPage`, `PaymentsTab`, `FundAProjectPage`,
  `serviceSubbmission`, `details.tsx`, `EventDetailPage`, `MyRegistrationsPage` and
  `PayUpForASingleDue` all updated. `serviceSubbmission` was rewritten — it had three
  overlapping submit paths, one per legacy payment type.

- [x] **MP-1 · `payDue()` pointed at a route that never existed.**
  `/dues/process_payment/due/:id/` — no `/api` prefix, no such handler. It could only
  404. **RESOLVED (2026-08-18):** Removed; `PayUpForASingleDue` now uses
  `startDuePayment`.

- [x] **MP-2 · `events-api.ts` is full of dead endpoints.**
  `registerForFreeEvent`, `registerForPaidEvent`, `postEventPaymentSuccess`,
  `getEventRegisteredMembers`, `getEventAttendees`, `requestReschedule`, `getReschedule`
  all call `/api/events/eventview/...`, `/api/events/payment/` or `/api/events/save/payment/`
  — **none of which exist on this backend**. Pre-existing, not caused by the payment work.
  Verify against `src/routes/event.routes.js` and delete what is dead.
  **RESOLVED (2026-08-18):** All eight removed after checking each against
  `src/routes/event.routes.js` — only `/eventview/get_events/` exists.

- [x] **MP-3 · `PayUpForASingleDue` only handles the Paystack path.**
  If a due offers bank transfer only, it now tells the member to use the Dues page rather
  than silently failing. Better: render `BankTransferPanel` there too.
  **RESOLVED (2026-08-18):** It now renders `BankTransferPanel` in place, so a
  transfer-only due is completed on the same screen instead of redirecting the member to
  the Dues page.

- [x] **MP-4 · `useDynamicPaymentApi` (`src/api/payment.ts`) was dead.**
  It drove the old external payment-link flow, which no longer exists as a configured
  method. Check remaining callers and remove.
  **RESOLVED (2026-08-18):** Removed. It posted to `/dues/process_payment/...` (no `/api`
  prefix, no such handler) and `pay()` had no callers left — only `loadingPay`, which was
  permanently false, was still destructured in `DuesPage` and `PaymentsTab`.

- [x] **MP-6 · Three unreachable payment-success pages removed.**
  `/event/success/:eventId`, the FundAProject success page and the service success page
  were all routed but unreachable — every payment now returns to `/paystack/callback`, and
  the only thing that linked to `/event/success` was `registerForPaidEvent`, itself dead.
  Two of the three also posted to endpoints that do not exist. Their API callers
  (`postEventPaymentSuccess`, `postPaymentSuccess`, `postServicePaymentSuccess`) went too,
  and the backend's now-orphaned `POST /api/services/payment-success` with them.

- [x] **MP-7 · Nine unreferenced modules removed.**
  `accordion/Accordion`, `cards/ElectionPositionCard`, `grid/PublicationGrid`,
  `tables/CompletedPaymentTable`, `tables/PendingPaymentTable`, `data/notificationData`,
  `elections/ElectionContestantsPage`, `support/ContactUsPage`.

  **Note for future sweeps:** `components/TenantProvider.tsx` looks unreferenced to a
  naive grep because `main.tsx` imports it under a different name *and* with an explicit
  extension — `import TenantGate from "./components/TenantProvider.tsx"`. It is load-bearing.
  Always confirm with a build, not a grep.

- [x] **MP-5 · Election results view does not use the results endpoint.**
  The admin app got a rebuilt results view (`FE-4`); this app still renders from
  `fetchElectionDetails`. `fetchElectionResults` exists in `api-elections.ts` and is
  unused. The backend now returns per-position `isTie`/`winners[]` and a
  timezone-correct `status` — worth surfacing "voting open/closed" to members.

  **RESOLVED (2026-08-18):** The page now reads the server's `status` instead of
  recomputing the voting window in the browser. The old `isElectionOngoing()` used
  `setHours`, resolving the election's wall-clock end time against the **viewer's**
  timezone — the same bug `BE-6` fixed on the backend — and it ignored an admin closing the
  election early (`FE-14`). Members also now see an explicit "Voting open / closed / not
  yet open" badge.