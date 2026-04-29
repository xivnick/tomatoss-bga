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
        return $this->game->performResolveBonus($activePlayerId);
    }
}
