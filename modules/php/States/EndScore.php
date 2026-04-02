<?php

declare(strict_types=1);

namespace Bga\Games\tomatoss\States;

use Bga\GameFramework\StateType;
use Bga\Games\tomatoss\Game;

const ST_END_GAME = 99;

class EndScore extends \Bga\GameFramework\States\GameState
{
    public function __construct(protected Game $game)
    {
        parent::__construct($game,
            id: 98,
            type: StateType::GAME,
        );
    }

    public function onEnteringState()
    {
        $result = $this->game->finalizeScores();

        $this->bga->notify->all('gameEndSummary', clienttranslate('The festival ends'), [
            'winnerIds' => $result['winnerIds'],
        ]);

        return ST_END_GAME;
    }
}
