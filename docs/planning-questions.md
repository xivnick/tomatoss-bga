# Tomatoss BGA Planning Questions

References:
- BGA walkthrough: https://en.doc.boardgamearena.com/Create_a_game_in_BGA_Studio%3A_Complete_Walkthrough
- Local rules PDF: `../tomatoss-web/tomatoss_rulebook.pdf` in the parent workspace
- Local example: `../reversi/`

Current local findings:
- `tomatoss-bga/` is a BGA starter project with state-class scaffolding.
- `tomatoss-web/` contains a Python rules engine that is currently the best local source of truth.
- `reversi/` is the main reference implementation for BGA state flow and UI structure.

Current rules inferred from `tomatoss-web`:
- 2 to 4 players.
- Starting hand sizes increase by turn order from the starting player.
- 3 tomato slots and 3 target slots are visible on the board.
- Each turn has 3 placements.
- Main action types: collect, normal toss, quick toss, discard down.
- Repeat-placement bonuses exist for `3` and `2+1` patterns.
- Hand limit is 8.
- Game ends after the current turn when target cards are exhausted.
- Tie-breaker is remaining hand sum.

Questions that still need product/rules confirmation:
1. Is first implementation scope 2 players only or 2 to 4 players?
2. Is the Python engine fully aligned with the physical rulebook?
3. What is the exact natural-language rule text for the basket toggle behavior?
4. Are original publisher art assets allowed for local Studio use only, or also for any external private git?
5. Is the initial goal a private prototype or a publishable BGA implementation?

Implementation direction confirmed from BGA docs:
1. Use class-based states in `modules/php/States`.
2. Keep player actions behind `#[PossibleAction]`.
3. Return only visible information from `getAllDatas`.
4. Implement zombie logic inside each active player state.
5. Keep documentation PDFs out of version control.
6. Do not commit sensitive config such as SFTP credentials.
7. Do not commit original publisher graphics to an external git repository.

Proposed Tomatoss state machine:
1. `setupNewGame`
2. `playerTurn`
3. `resolveBonus`
4. `discardDown`
5. `nextPlayer`
6. `endScore`

Immediate engineering tasks:
1. Replace template game metadata with Tomatoss-specific values.
2. Define initial DB schema for cards, player flags, and per-turn action history.
3. Replace template player actions with Tomatoss semantic actions.
4. Expose enough state in `getAllDatas` for a minimal playable UI.
5. Add stats for collect/toss/pattern behavior.
