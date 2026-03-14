<?php

declare(strict_types=1);

namespace Bga\Games\tomatoss\States;

use Bga\GameFramework\StateType;
use Bga\Games\tomatoss\Game;

class ResolveBonus extends \Bga\GameFramework\States\GameState
{
    public function __construct(protected Game $game)
    {
        parent::__construct($game,
            id: 20,
            type: StateType::GAME,
        );
    }

    public function onEnteringState()
    {
        $activePlayerId = (int) $this->game->getActivePlayerId();
        $actions = $this->game->getCurrentTurnActionLog();
        $spaces = array_map(static fn(array $action): int => (int) $action['space'], $actions);
        $counts = array_count_values($spaces);

        if (in_array(3, $counts, true)) {
            $this->bga->playerStats->inc('pattern3', 1, $activePlayerId);
        } elseif (in_array(2, $counts, true)) {
            $this->bga->playerStats->inc('pattern21', 1, $activePlayerId);
        } else {
            $this->bga->playerStats->inc('pattern111', 1, $activePlayerId);
        }

        // TODO: resolve bonus draw and basket toggle once cards are wired.
        return $this->game->shouldEnterDiscardDown($activePlayerId) ? DiscardDown::class : NextPlayer::class;
    }
}
