<?php

declare(strict_types=1);

namespace Bga\Games\tomatoss\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\tomatoss\Game;

class DiscardDown extends \Bga\GameFramework\States\GameState
{
    public function __construct(protected Game $game)
    {
        parent::__construct($game,
            id: 30,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    public function getArgs(): array
    {
        return [
            'turnNo' => $this->game->getTurnNo(),
            'currentSeatId' => $this->game->getCurrentSeatId(),
            'discardCountNeeded' => $this->game->getDiscardCountNeeded((int) $this->game->getActivePlayerId()),
            'currentTurnActions' => $this->game->getCurrentTurnActionLog(),
            'placementsRemaining' => $this->game->getPlacementsRemaining(),
            'boardTomatoes' => $this->game->getBoardTomatoSlots(),
            'boardTargets' => $this->game->getBoardTargetSlots(),
            'tomatoDeckCount' => $this->game->getTomatoDeckCount(),
            'targetDeckCount' => $this->game->getTargetDeckCount(),
            'latestDiscardTomato' => $this->game->getLatestDiscardTomato(),
            'discardTomatoes' => $this->game->getTomatoDiscardCards(),
            'handCountsByPlayer' => $this->game->getHandCountsByPlayer(),
            'capturedTargetsByPlayer' => $this->game->getCapturedTargetsByPlayer(),
        ];
    }

    #[PossibleAction]
    public function actDiscardCards(string $cardsJson, int $activePlayerId)
    {
        $cardIds = json_decode($cardsJson, true);
        if (!is_array($cardIds)) {
            throw new UserException(clienttranslate('Invalid discard choice'));
        }
        return $this->game->performDiscardAction($activePlayerId, $cardIds);
    }

    public function zombie(int $playerId)
    {
        $hand = $this->game->getHandForPlayer($playerId);
        $needed = $this->game->getDiscardCountNeeded($playerId);
        $cardIds = array_map(static fn(array $card): int => (int) $card['id'], array_slice($hand, 0, $needed));

        return $this->actDiscardCards((string) json_encode($cardIds), $playerId);
    }
}
