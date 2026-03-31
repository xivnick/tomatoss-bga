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
            'discardCountNeeded' => $this->game->getDiscardCountNeeded((int) $this->game->getActivePlayerId()),
            'currentTurnActions' => $this->game->getCurrentTurnActionLog(),
            'placementsRemaining' => $this->game->getPlacementsRemaining(),
            'boardTomatoes' => $this->game->getBoardTomatoSlots(),
            'boardTargets' => $this->game->getBoardTargetSlots(),
            'tomatoDeckCount' => $this->game->getTomatoDeckCount(),
            'targetDeckCount' => $this->game->getTargetDeckCount(),
            'latestDiscardTomato' => $this->game->getLatestDiscardTomato(),
            'availableQuickRevealValues' => $this->game->getAvailableQuickRevealValues(),
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

        $result = $this->game->discardCardsByIds($activePlayerId, $cardIds);
        $discardValues = array_map(static fn(array $card): int => (int) $card['value'], $result['discarded']);

        $this->bga->notify->all('discardCard', clienttranslate('${player_name} discards cards'), [
            'player_id' => $activePlayerId,
            'player_name' => $this->game->getPlayerNameById($activePlayerId),
            'cardValues' => $discardValues,
            'latestDiscardTomato' => $result['latestDiscardTomato'],
            'availableQuickRevealValues' => $this->game->getAvailableQuickRevealValues(),
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
        $hand = $this->game->getHandForPlayer($playerId);
        $needed = $this->game->getDiscardCountNeeded($playerId);
        $cardIds = array_map(static fn(array $card): int => (int) $card['id'], array_slice($hand, 0, $needed));

        return $this->actDiscardCards((string) json_encode($cardIds), $playerId);
    }
}
