# Tomatoss Web Rules Spec

Source of truth: `tomatoss-web/tomatoss/core/game.py`, `rules.py`, `types.py`.

## Core Entities

- Tomato card values: `1..7`
- Tomato deck composition:
  - `1 x3`
  - `2 x3`
  - `3 x13`
  - `4 x5`
  - `5 x8`
  - `6 x4`
  - `7 x4`
- Target card pool: 30 cards with `id`, `desc`, `base`, `toss`, `check`
- Player state:
  - `hand: list[int]`
  - `score: int`
  - `basket_full: bool`
  - `captured_targets: list[TargetCard]`
  - `collected_from_board_counts: list[int]`

## Config

- Players: `2..4`
- Hand limit: `8`
- Tokens per turn: `3`
- Max turns: `300`
- Submission caps by card value:
  - `1 -> 3`
  - `2 -> 3`
  - `3 -> 5`
  - `4 -> 4`
  - `5 -> 3`
  - `6 -> 3`
  - `7 -> 3`

## Setup

- Shuffle tomato deck.
- Shuffle target deck.
- Remove targets before starting:
  - `4p`: remove `5`
  - `2p/3p`: remove `10`
- Fill board:
  - tomato slots `3`
  - target slots `3`
- Starting hand sizes follow seat order from the starting player:
  - starter `2`
  - next `3`
  - next `4`
  - next `5`
- Every player starts with:
  - `score = 0`
  - `basket_full = True`

## Turn Structure

- A turn has `3` placement tokens.
- Legal placement spaces:
  - `0..2`: collect from tomato board slot
  - `3..5`: toss to target board slot
  - `6`: discard during discard phase only
- `current_placements` stores all spaces used this turn.

## Collect Action

- Allowed if:
  - not in discard phase
  - placements used `< 3`
  - chosen tomato slot is non-empty
- Effect:
  - picked board tomato goes to hand
  - board slot refills from tomato deck
  - if tomato deck empty, public discard is reshuffled into deck first

## Toss Action

- Allowed if:
  - not in discard phase
  - placements used `< 3`
  - chosen target slot is non-empty
  - submitted cards respect submission caps
- Normal toss:
  - submitted cards must already satisfy target check
- Quick toss:
  - submitted cards may be empty
  - action is legal if there exists any possible revealed tomato `1..7` that would satisfy the target
- Resolution:
  - submitted cards are removed from hand and moved to public discard
  - quick toss reveals one tomato from deck to discard and includes it in the check
  - success:
    - gain `target.base` for normal toss
    - gain `target.toss` for quick toss
    - target is moved to player captured area
    - refill target slot from target deck if possible
    - if no replacement target exists, end-of-game is armed for end of current turn
  - failure:
    - no score
    - target remains

## Turn-End Bonus

After the 3rd placement:

- Pattern `3`:
  - all placements in same space
  - draw `1` bonus tomato
- Pattern `21`:
  - one space used twice, another once
  - if `basket_full = True`:
    - set `basket_full = False`
    - draw `1` bonus tomato
  - else:
    - set `basket_full = True`
- Pattern `111`:
  - all three placements in different spaces
  - no bonus

## Discard Phase

- If hand size `> 8` after bonus resolution, enter discard phase.
- Legal discard actions:
  - choose one card value that exists in hand
- Each discard:
  - removes one matching tomato from hand
  - sends it to public discard
- Discard phase ends when hand size `<= 8`

## End of Turn

- Happens immediately after 3 placements if hand size `<= 8`, or after discard phase finishes.
- Reset:
  - `tokens_placed = 0`
  - `current_placements = []`
  - `discard_phase = False`
- Advance to next player.

## End Game

- End is armed when a target succeeds and no replacement target can be drawn.
- Actual game over happens at end of the current turn.
- Hard stop also exists at `300` turns.

## Winner

- Highest score wins.
- Tie breaker:
  - highest sum of remaining hand wins

## Important Implementation Notes

- Quick toss legality is existential:
  - legal if any reveal `1..7` can work
- Quick toss may submit zero cards.
- Submission caps are part of legality, not only AI action generation.
- Public discard is the reshuffle source for tomato deck.
