# Target Card Spec

This file exists for manual verification of target-card order against the mission sprite sheet.

Reference files:

- [mission_cards.png](/Users/XIV/Documents/Development/tomatoss-codex/tomatoss-bga/img/mission_cards.png)
- [Game.php](/Users/XIV/Documents/Development/tomatoss-codex/tomatoss-bga/modules/php/Game.php)
- [rules.py](/Users/XIV/Documents/Development/tomatoss-codex/tomatoss-web/tomatoss/core/rules.py)

Assumed mission sheet layout:

- `6` columns x `5` rows
- card ids increase left-to-right, top-to-bottom

Coordinate formula:

- `row = floor((id - 1) / 6) + 1`
- `col = ((id - 1) % 6) + 1`

| id | row | col | desc | normal | quick |
| --- | --- | --- | --- | --- | --- |
| 1 | 1 | 1 | `[card] = 3` | 2 | 3 |
| 2 | 1 | 2 | `[card] = 3` | 2 | 3 |
| 3 | 1 | 3 | `[card] = [card]` | 3 | 6 |
| 4 | 1 | 4 | `[card] = [card]` | 3 | 6 |
| 5 | 1 | 5 | `[card] = [card] < [card]` | 5 | 7 |
| 6 | 1 | 6 | `[card] = [card] = [card]` | 5 | 10 |
| 7 | 2 | 1 | `[card] = 5/6/7` | 2 | 3 |
| 8 | 2 | 2 | `[card] = 5/6/7` | 2 | 3 |
| 9 | 2 | 3 | `[card] = 1/2` | 3 | 6 |
| 10 | 2 | 4 | `[SUM] = 8~9` | 4 | 6 |
| 11 | 2 | 5 | `[SUM] = 8~9` | 4 | 6 |
| 12 | 2 | 6 | `(3X) [SUM] = 8~9` | 4 | 8 |
| 13 | 3 | 1 | `[card] = 6/7` | 3 | 5 |
| 14 | 3 | 2 | `[card] - [card] = 1` | 4 | 5 |
| 15 | 3 | 3 | `[card] - [card] = 1` | 4 | 5 |
| 16 | 3 | 4 | `[SUM] = 11~13` | 4 | 6 |
| 17 | 3 | 5 | `[SUM] = 11~13` | 4 | 6 |
| 18 | 3 | 6 | `(3X) [SUM] = 11~13` | 4 | 7 |
| 19 | 4 | 1 | `[card] = 2/4/6` | 2 | 4 |
| 20 | 4 | 2 | `[card] = 2/4/6` | 2 | 4 |
| 21 | 4 | 3 | `[SUM] = 6~8` | 3 | 4 |
| 22 | 4 | 4 | `[SUM] = 6~8` | 3 | 4 |
| 23 | 4 | 5 | `(3X) [SUM] = 6~8` | 3 | 6 |
| 24 | 4 | 6 | `[card] + [card] = 10` | 4 | 8 |
| 25 | 5 | 1 | `[card] = 4/5` | 2 | 3 |
| 26 | 5 | 2 | `[card] = 5` | 2 | 5 |
| 27 | 5 | 3 | `[SUM] = 7~11` | 3 | 3 |
| 28 | 5 | 4 | `(3X) [SUM] = 7~11` | 3 | 5 |
| 29 | 5 | 5 | `[card] - [card] = 4~6` | 4 | 5 |
| 30 | 5 | 6 | `[card] - [card] = 4~6` | 4 | 5 |

Verification checklist:

- Compare each visible mission card in `mission_cards.png` to the row/col and `id` above.
- Confirm score numbers on the art match `normal` and `quick`.
- Confirm bottom condition text/icon matches `desc`.

Current implementation assumption:

- PHP and Python both assume this exact order.
- If the sprite order differs from this file, update the sprite mapping or target-id mapping before changing rules logic.
