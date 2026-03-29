<?php

declare(strict_types=1);

namespace Bga\Games\tomatoss\States;

use Bga\GameFramework\StateType;
use Bga\GameFramework\States\GameState;
use Bga\GameFramework\States\PossibleAction;
use Bga\GameFramework\UserException;
use Bga\Games\tomatoss\Game;

class PlayerTurn extends GameState
{
    public function __construct(protected Game $game)
    {
        parent::__construct($game,
            id: 10,
            type: StateType::ACTIVE_PLAYER,
        );
    }

    public function getArgs(): array
    {
        return [
            'placementsRemaining' => $this->game->getPlacementsRemaining(),
            'boardTomatoes' => $this->game->getBoardTomatoSlots(),
            'boardTargets' => $this->game->getBoardTargetSlots(),
            'tomatoDeckCount' => $this->game->getTomatoDeckCount(),
            'targetDeckCount' => $this->game->getTargetDeckCount(),
            'latestDiscardTomato' => $this->game->getLatestDiscardTomato(),
            'handCountsByPlayer' => $this->game->getHandCountsByPlayer(),
            'currentTurnActions' => $this->game->getCurrentTurnActionLog(),
            'capturedTargetsByPlayer' => $this->game->getCapturedTargetsByPlayer(),
        ];
    }

    #[PossibleAction]
    public function actCollectTomato(int $slot, int $activePlayerId)
    {
        $result = $this->game->collectTomatoFromSlot($activePlayerId, $slot);
        $this->game->recordTurnAction($activePlayerId, $slot, 'collect');
        $this->bga->playerStats->inc('tomatoCollected', 1, $activePlayerId);

        $this->bga->notify->all('turnAction', clienttranslate('${player_name} collects from tomato slot ${slot_no}'), [
            'player_id' => $activePlayerId,
            'player_name' => $this->game->getPlayerNameById($activePlayerId),
            'slot_no' => $slot + 1,
            'space' => $slot,
            'targetIndex' => null,
            'refill' => $result['refill'],
            'tomatoDeckCount' => $result['tomatoDeckCount'],
            'handCount' => count($this->game->getHandForPlayer($activePlayerId)),
        ]);
        $this->bga->notify->player($activePlayerId, 'privateHandUpdate', '', [
            'player_id' => $activePlayerId,
            'mode' => 'collect',
            'collected' => $result['collected'],
            'playerHand' => $this->game->getHandForPlayer($activePlayerId),
        ]);

        return $this->game->shouldResolveBonus() ? ResolveBonus::class : PlayerTurn::class;
    }

    #[PossibleAction]
    public function actTossToTarget(int $slot, string $cardsJson, bool $quickToss, int $activePlayerId)
    {
        $cardIds = json_decode($cardsJson, true);
        if (!is_array($cardIds)) {
            throw new UserException(clienttranslate('Invalid card selection'));
        }

        $actionKind = $quickToss ? 'quick_toss' : 'normal_toss';
        $result = $this->game->tossToTarget($activePlayerId, $slot, $cardIds, $quickToss);
        $cardValues = array_map(static fn(array $card): int => (int) $card['value'], $result['selectedCards']);
        $this->game->recordTurnAction(
            $activePlayerId,
            $slot,
            $actionKind,
            $cardValues,
            $quickToss,
            $result['targetId'],
            $result['revealed']['value'] ?? null,
            $result['scoreGained']
        );

        if ($quickToss) {
            $this->bga->playerStats->inc('quickTossAttempts', 1, $activePlayerId);
            if ($result['success']) {
                $this->bga->playerStats->inc('quickTossSuccesses', 1, $activePlayerId);
            }
        } else {
            $this->bga->playerStats->inc('normalTosses', 1, $activePlayerId);
        }

        $this->bga->notify->all(
            'turnAction',
            $result['success']
                ? (
                    $quickToss
                        ? clienttranslate('${player_name} succeeds with a quick toss on target slot ${slot_no}')
                        : clienttranslate('${player_name} succeeds on target slot ${slot_no}')
                )
                : (
                    $quickToss
                        ? clienttranslate('${player_name} fails a quick toss on target slot ${slot_no}')
                        : clienttranslate('${player_name} fails on target slot ${slot_no}')
                ),
            [
                'player_id' => $activePlayerId,
                'player_name' => $this->game->getPlayerNameById($activePlayerId),
                'slot_no' => $slot - 2,
                'space' => $slot,
                'targetIndex' => $slot - 3,
                'cards' => $cardValues,
                'quickToss' => $quickToss,
                'success' => $result['success'],
                'targetId' => $result['targetId'],
                'revealed' => $result['revealed'],
                'scoreGained' => $result['scoreGained'],
                'replacementTarget' => $result['replacementTarget'],
                'publicDiscardCount' => $result['publicDiscardCount'],
                'latestDiscardTomato' => $result['latestDiscardTomato'],
                'targetDeckCount' => $result['targetDeckCount'],
                'tomatoDeckCount' => $result['tomatoDeckCount'],
                'capturedTargetsByPlayer' => $result['capturedTargetsByPlayer'],
                'handCount' => count($result['remainingHand']),
            ]
        );
        $this->bga->notify->player($activePlayerId, 'privateHandUpdate', '', [
            'player_id' => $activePlayerId,
            'mode' => 'toss',
            'playerHand' => $result['remainingHand'],
        ]);

        return $this->game->shouldResolveBonus() ? ResolveBonus::class : PlayerTurn::class;
    }

    public function zombie(int $playerId)
    {
        return $this->actCollectTomato(0, $playerId);
    }
}
