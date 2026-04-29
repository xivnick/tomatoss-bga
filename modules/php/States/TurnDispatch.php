<?php

declare(strict_types=1);

namespace Bga\Games\tomatoss\States;

use Bga\GameFramework\StateType;
use Bga\Games\tomatoss\Game;

class TurnDispatch extends \Bga\GameFramework\States\GameState
{
    public function __construct(protected Game $game)
    {
        parent::__construct($game,
            id: 5,
            type: StateType::GAME,
        );
    }

    public function getArgs(): array
    {
        $seatId = $this->game->getCurrentSeatId();

        return [
            'turnNo' => $this->game->getTurnNo(),
            'currentSeatId' => $seatId,
            'isBotSeat' => $seatId !== null && $this->game->isBotSeat($seatId),
            'placementsRemaining' => $this->game->getPlacementsRemaining(),
            'boardTomatoes' => $this->game->getBoardTomatoSlots(),
            'boardTargets' => $this->game->getBoardTargetSlots(),
            'tomatoDeckCount' => $this->game->getTomatoDeckCount(),
            'targetDeckCount' => $this->game->getTargetDeckCount(),
            'latestDiscardTomato' => $this->game->getLatestDiscardTomato(),
            'discardTomatoes' => $this->game->getTomatoDiscardCards(),
            'handCountsByPlayer' => $this->game->getHandCountsByPlayer(),
            'currentTurnActions' => $this->game->getCurrentTurnActionLog(),
            'capturedTargetsByPlayer' => $this->game->getCapturedTargetsByPlayer(),
        ];
    }

    public function onEnteringState()
    {
        $seatId = $this->game->getCurrentSeatId();
        if ($seatId === null) {
            throw new \RuntimeException('No current seat to dispatch');
        }

        if ($this->game->isBotSeat($seatId)) {
            return $this->game->runBotTurn($seatId);
        }

        $playerId = $this->game->getHumanPlayerIdForSeat($seatId);
        if ($playerId === null) {
            throw new \RuntimeException('Current human seat is missing a BGA player id');
        }

        $this->game->gamestate->changeActivePlayer($playerId);
        $this->game->giveExtraTime($playerId);

        return PlayerTurn::class;
    }
}
