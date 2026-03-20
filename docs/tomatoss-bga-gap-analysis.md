# Tomatoss BGA Gap Analysis

Compared documents:

- `docs/tomatoss-web-rules-spec.md`
- `docs/tomatoss-bga-behavior-spec.md`

Compared implementation:

- `modules/php/Game.php`
- `modules/php/States/*.php`
- `modules/js/Game.js`

## Aligned

- Tomato deck composition
- Target deck trimming by player count
- Starting hand sizes by turn order
- Board setup with 3 tomato slots and 3 target slots
- Collect action
- Quick toss reveal flow
- Target replacement flow
- Bonus pattern handling
- Discard-down phase
- Private hand updates separated from public notifications
- Tie-break by remaining hand sum
- Submission caps enforced server-side

## Partially Aligned

- BGA client toss UX:
  - current UI auto-selects normal toss if legal, else quick toss
  - spec allows UI confirmation when both are legal
- End-of-turn endgame signaling:
  - current PHP logic relies on empty target deck/board state checks
  - behavior should continue to be tested against final-target edge cases

## Remaining Risks / Follow-up

- JS still contains duplicated target-check logic for local convenience.
  - authoritative legality must remain server-side
  - client helper can drift from PHP if not kept in sync
- Player-zone UI is still being tuned visually.
  - logic-safe, but layout-safe verification still needs Studio checks
- No automated parity test exists between Python engine and PHP engine.
  - best next step is to script scenario comparisons for:
    - quick toss with zero submitted cards
    - submission cap violations
    - final target exhaustion
    - bonus pattern transitions
