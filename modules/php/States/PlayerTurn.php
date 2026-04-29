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
            'turnNo' => $this->game->getTurnNo(),
            'currentSeatId' => $this->game->getCurrentSeatId(),
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

    #[PossibleAction]
    public function actCollectTomato(int $slot, int $activePlayerId)
    {
        return $this->game->performCollectAction($activePlayerId, $slot);
    }

    #[PossibleAction]
    public function actTossToTarget(int $slot, string $cardsJson, bool $quickToss, int $activePlayerId)
    {
        $cardIds = json_decode($cardsJson, true);
        if (!is_array($cardIds)) {
            throw new UserException(clienttranslate('Invalid card selection'));
        }
        return $this->game->performTossAction($activePlayerId, $slot, $cardIds, $quickToss);
    }

    public function zombie(int $playerId)
    {
        $normalToss = $this->findZombieNormalToss($playerId);
        if ($normalToss !== null) {
            return $this->actTossToTarget($normalToss['slot'], json_encode($normalToss['cardIds']), false, $playerId);
        }

        $collectableSlots = [];
        foreach ($this->game->getBoardTomatoSlots() as $slot => $card) {
            if ($card !== null) {
                $collectableSlots[] = (int) $slot;
            }
        }
        if ($collectableSlots !== []) {
            shuffle($collectableSlots);
            return $this->actCollectTomato($collectableSlots[0], $playerId);
        }

        throw new UserException(clienttranslate('No valid zombie action is available'));
    }

    private function findZombieNormalToss(int $playerId): ?array
    {
        $hand = $this->game->getHandForPlayer($playerId);
        if ($hand === []) {
            return null;
        }

        $boardTargets = $this->game->getBoardTargetSlots();
        $handCount = count($hand);
        $maxMask = 1 << $handCount;

        foreach ($boardTargets as $targetSlot => $targetCard) {
            if ($targetCard === null) {
                continue;
            }

            for ($mask = 1; $mask < $maxMask; $mask++) {
                $cardIds = [];
                for ($index = 0; $index < $handCount; $index++) {
                    if ($mask & (1 << $index)) {
                        $cardIds[] = (int) $hand[$index]['id'];
                    }
                }

                try {
                    $this->game->assertCanTossToTarget($playerId, $targetSlot + 3, $cardIds, false);
                    return [
                        'slot' => $targetSlot + 3,
                        'cardIds' => $cardIds,
                    ];
                } catch (UserException) {
                    // Try the next combination.
                }
            }
        }

        return null;
    }

}
