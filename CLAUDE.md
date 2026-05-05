# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the prototype

```bash
open index.html   # macOS — no build step, no server needed
```

The prototype is a static single-page app. All state is in-memory and resets on refresh.

## Architecture

Three files, no dependencies:

| File | Role |
|---|---|
| `index.html` | DOM structure — tab panels, wallet cards, modals |
| `styles.css` | Hand-rolled CSS (~400 lines). Variables: `--green-500`, `--red-500`, `--amber-500`, `--indigo-600` for color semantics |
| `app.js` | All logic — mock data, state machine, renderers, event handlers |

### `app.js` structure

**Mock data (top of file, read-only intent):**
- `CLUBS[]` — per-club baseline: `club`, `dscLab`, `minted`, `burned`
- `CLUB_MEMBERS{}` — per-club member wallet baselines
- `TX_HISTORY{}` — initial transaction lists for each scope (`member`, `club`, `dscLab`)
- `REASON_CODES{}` — dropdown options for distribute / gift / burn

**Mutable runtime state:**
- `walletState` — active member and club balances
- `activities[]` — in-flight member activities
- `activeClub` — currently selected club object (mutated directly in transfer flows)
- `activeTab` — drives `renderVisibility()`

**Rendering:** a single `render()` master function calls all sub-renderers. Every state-mutating action ends with `render()`.

**Modal pattern:** `openModal(id)` / `closeModal(id)` toggle `.open` class on `.modal-overlay` elements.

## Token flow domain

Three wallet roles:
- **Member Wallet** — `available` + `locked` split. Lock/unlock is off-chain (JS state only); on-chain transfer only happens on *Spend*.
- **Club Wallet** — funded by Stripe purchase, DSC Lab gift, or expired-member donation. Distributed out to members.
- **DSC Lab Wallet** — treasury that collects all member spend. Can gift to Club or burn.

**Conservation invariant** (must hold after any state change):
```
Minted − Burned = Club + DSC Lab + Members(available + locked)
```

The mock numbers in `CLUBS[]` satisfy this. When adding new flows or changing numbers, verify the equation holds.

**Activity state machine (Member View):**

| Outcome | Sponsor tokens | Voter tokens |
|---|---|---|
| Complete | already returned at idea→proposal | Spent → DSC Lab |
| Vetoed | Unlocked → Available | Unlocked → Available |
| Lapsed | Spent (half) → DSC Lab | Unlocked → Available |
| Cancelled | Spent → DSC Lab | Unlocked → Available |

Lock/unlock moves: `walletState.member.available` ↔ `walletState.member.locked`  
Spend moves: `walletState.member.locked -= cost` + `activeClub.dscLab += cost`

## Key design constraints

- No build step — no Tailwind, no bundler, no npm. Hand-rolled CSS only.
- No backend calls — Stripe, Kaleido, and auth are all UI-only mocks. Password re-auth accepts any input.
- Club picker switching syncs both Club View and DSC Lab View to the same `activeClub`.
- `addTx(scope, tx)` prepends to `TX_HISTORY[scope]` — call it for both sides of every transfer (e.g. gift records a DSC Lab outflow and a Club inflow).
