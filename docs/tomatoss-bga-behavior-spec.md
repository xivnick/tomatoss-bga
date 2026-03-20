# Tomatoss BGA Behavior Spec

This document translates the Python rule engine into BGA state and client behavior.

## Authority

- Rule authority: `docs/tomatoss-web-rules-spec.md`
- BGA must not invent alternate legality rules.

## Public vs Private Data

Public:

- board tomato slots
- board target slots
- turn action log for current turn
- player scores
- basket state
- captured targets by player
- hand counts by player
- discard top card
- deck counts

Private:

- local player full hand

Rule:

- Full hand arrays must only be sent through private notifications or `getAllDatas($currentPlayerId)`.
- State args for active states must not expose active player hand to all clients.

## BGA State Machine

### `PlayerTurn`

Active player state.

Inputs:

- collect from slot `0..2`
- toss to slot `3..5`

Server obligations:

- reject illegal actions
- record turn action
- update public board state
- send private hand update to acting player only

Transitions:

- if placements `< 3`: stay in `PlayerTurn`
- after 3rd placement: `ResolveBonus`

### `ResolveBonus`

Game state.

Server obligations:

- inspect current turn placement pattern
- apply basket toggle / bonus draw
- send public basket and hand-count updates
- send private hand update if acting player gained a card

Transitions:

- if hand size `> 8`: `DiscardDown`
- else: `NextPlayer`

### `DiscardDown`

Active player state.

Inputs:

- discard one card value that exists in hand

Transitions:

- if hand still `> 8`: stay in `DiscardDown`
- else: `NextPlayer`

### `NextPlayer`

Game state.

Server obligations:

- if end-of-game armed and target board empty after turn, go to `EndScore`
- else reset turn action log and advance active player

### `EndScore`

Game state.

- compute winner by score, then remaining hand sum

## Action Legality Rules

### Collect

- slot must be `0..2`
- slot must contain a tomato
- placements remaining must be `> 0`

### Toss

- slot must be `3..5`
- target slot must contain a target
- placements remaining must be `> 0`
- selected cards must all belong to acting player
- selected cards must respect submission caps:
  - `1:3 2:3 3:5 4:4 5:3 6:3 7:3`
- normal toss:
  - target must match selected cards exactly
- quick toss:
  - selected cards may be empty
  - must be possible for some reveal `1..7`

### Discard

- allowed only in discard phase
- discarded value must exist in hand

## Notification Model

Public notifications update:

- board slots
- deck counts
- discard top card
- captured targets
- hand counts
- basket state
- turn action log

Private notifications update:

- local hand only

## UI Behavior

### Festival Stage

- one proportional canvas
- all stage items scale together
- no row-based independent resizing
- stage contains:
  - mission deck + 3 mission cards
  - festival board
  - discard top card
  - 3 tomato cards + tomato deck
  - remaining token tray

### Board Slots

- 6 click zones mapped to measured board centers
- used-turn tokens are visual markers only
- if multiple tokens share a slot, later tokens appear slightly above earlier ones

### Player Zone

Two-row layout:

- top row: hidden hand backs repeated by hand count
- bottom row: player board + captured targets behind it

Captured target layout:

- normal toss captures extend outward to the left
- quick toss captures extend outward to the right
- latest capture is furthest outward and furthest back
- player board must stay visually in front

## Current Alignment Targets

High-priority parity with Python engine:

1. submission caps enforced server-side
2. private hand isolation
3. quick toss legality with empty submission allowed
4. turn-end bonus and discard flow matching Python engine
5. end-of-game armed at final target exhaustion, resolved only after turn end
