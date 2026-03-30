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
        $this->game->ensureSchemaReady();

        return [
            'currentTurnActions' => $this->game->getCurrentTurnActionLog(),
            'placementsRemaining' => $this->game->getPlacementsRemaining(),
            'boardTomatoes' => $this->game->getBoardTomatoSlots(),
            'boardTargets' => $this->game->getBoardTargetSlots(),
            'tomatoDeckCount' => $this->game->getTomatoDeckCount(),
            'targetDeckCount' => $this->game->getTargetDeckCount(),
            'latestDiscardTomato' => $this->game->getLatestDiscardTomato(),
            'handCountsByPlayer' => $this->game->getHandCountsByPlayer(),
            'capturedTargetsByPlayer' => $this->game->getCapturedTargetsByPlayer(),
        ];
    }

    #[PossibleAction]
    public function actDiscardCard(int $cardValue, int $activePlayerId)
    {
        if ($cardValue < 1 || $cardValue > 7) {
            throw new UserException(clienttranslate('Invalid discard choice'));
        }

        $result = $this->game->discardCardByValue($activePlayerId, $cardValue);
        $this->bga->notify->all('discardCard', clienttranslate('${player_name} discards a card'), [
            'player_id' => $activePlayerId,
            'player_name' => $this->game->getPlayerNameById($activePlayerId),
            'cardValue' => $cardValue,
            'latestDiscardTomato' => $result['latestDiscardTomato'],
            'handCount' => count($result['remainingHand']),
        ]);
        $this->bga->notify->player($activePlayerId, 'privateHandUpdate', '', [
            'player_id' => $activePlayerId,
            'mode' => 'discard',
            'playerHand' => $result['remainingHand'],
        ]);

        return $this->game->shouldEnterDiscardDown($activePlayerId) ? DiscardDown::class : NextPlayer::class;
    }

    public function zombie(int $playerId)
    {
        return $this->actDiscardCard(1, $playerId);
    }
}
