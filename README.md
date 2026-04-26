# SportHeist Token Flow — Prototype

Static HTML/CSS/vanilla-JS prototype demonstrating the token flow documented in [`../token-flow-chart.md`](../token-flow-chart.md).

**Open:** `open index.html` (no build step required)

---

## What's mocked

| Item | Mocked |
|---|---|
| Token balances | Hardcoded numbers satisfying conservation equation |
| Stripe purchase | UI flow only — accepts any input |
| Password re-auth | Modal accepts any input |
| Blockchain / Kaleido | No calls — state is client-side only |
| Multi-club switching | In-memory JS state (refresh resets) |

## File structure

```
prototype/
├── index.html   (single-page app)
├── styles.css   (~400 lines, hand-rolled)
├── app.js       (tabs, modals, mock state)
└── README.md    (this file)
```

## Views

1. **Member View** — Available/Locked wallet, purchase flow, transaction history with color-coded outcomes
2. **Club View** — Club picker, totals strip, wallet + funding sources, distribute to members with re-auth
3. **DSC Lab View** — Same club picker synced, wallet with minted/burned totals, gift + burn with re-auth

## Color semantics

- 🟢 Green = credit in / received
- 🔴 Red = spent / burned
- 🟡 Amber = locked
- ⚪ Gray = off-chain move (no blockchain)

---

*Generated: 2026-04-24*