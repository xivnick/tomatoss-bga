# Tomatoss Animation Plan

## Goal

Add movement/flip animations without rewriting the whole UI architecture.

The current UI already has stable DOM anchors for:
- shared stage card slots
- reserve tomato tokens
- board token slots
- self hand cards
- opponent hand fan
- captured target stacks
- discard pile

The plan is to animate transient overlay elements between these anchors.

## Principles

- Keep the existing render model. Do not rebuild the game around a new stock system yet.
- Use one overlay layer inside `#tomatoss-layout` for transient animation nodes.
- Animate from measured screen rectangles (`getBoundingClientRect()`), not from guessed offsets.
- Use real DOM anchors for both source and destination.
- After the animation finishes, render the final state normally.
- If an anchor is missing, skip the animation and fall back to immediate render.

## Shared Concepts

### Overlay layer

Create a top-level absolute/fixed animation layer that:
- covers the game layout
- ignores pointer events
- holds temporary cloned cards/tokens during animation

### Snapshot rects

Each animation will:
1. locate source element
2. locate destination element
3. clone/create a temporary node
4. place the temporary node at source rect
5. animate position and optionally scale/flip
6. remove temporary node

### Flip animation

For back-to-front transitions:
- first half: rotateY from `0deg` to `90deg` using card back
- at midpoint: switch to front sprite
- second half: rotateY from `-90deg` to `0deg`

## Event Animations

### Collect tomato

Trigger: `notif_turnAction` when `refill` exists.

Cases:
- local player collects:
  - source: board tomato slot card
  - destination: last slot position in self hand row
  - moving node: front tomato card
- opponent collects:
  - source: board tomato slot card
  - destination: opponent hand fan container
  - moving node: tomato back

Also animate one reserve token:
- source: the last visible reserve token
- destination: board action slot for `space`

Then:
- update board slot refill
- update hand count / private hand

### Toss / Quick toss

Trigger: `notif_turnAction` when no `refill`.

Immediate phase:
- local player hand removes selected cards immediately
- animate one reserve token to board action slot
- animate submitted cards from player hand area (self) or opponent hand fan (others) to recent-throw area

Quick toss extra:
- animate one card back from tomato deck to recent-throw area
- flip to revealed tomato front at midpoint

Cutscene phase:
- recent throw cards stay visible for `THROW_CUTSCENE_MS`

Resolution phase:
- remove cutscene
- render replacement target / discard / captured targets

### Captured target

Trigger: toss success during resolution phase.

Optional lightweight animation:
- source: target slot card
- destination: captured stack edge for the acting player
- moving node: mission card front

If this proves unstable, keep this as a second-step enhancement and only animate toss cards first.

### Discard down

Trigger: `notif_discardCard`.

Animate:
- selected cards from self hand to discard pile

For opponent discard:
- animate from opponent hand fan back to discard pile using back card

## DOM Anchors Needed

### Existing anchors

- `#mission-slot-0..2 .slot-card-host`
- `#tomato-slot-0..2 .slot-card-host`
- `#tomato-deck-slot`
- `#discard-slot .slot-card-host`
- `#token-reserve .reserve-token-*`
- `#festival-slot-layer .board-token-slot[data-space]`
- `.self-hand-row .hand-card-button[data-card-id]`
- `.player-hand-fan`
- `#captured-normal-{playerId}`
- `#captured-quick-{playerId}`

### New anchors to add

- `#animation-layer`
- a helper for “next self-hand insertion point”
- a helper for “recent throw row root”

## Implementation Order

1. Add animation layer and generic rect-based animation helpers.
2. Add reserve token movement animation.
3. Add collect card movement animation.
4. Add toss submitted-card movement animation.
5. Add quick-toss deck reveal + flip animation.
6. Add optional target-to-captured animation.

## Risk Management

- Do not animate by mutating the real card nodes.
- Always animate clones or temporary sprites.
- Do not block the render forever if animation fails.
- If any source/destination lookup fails, skip animation and continue.
