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
        $result = $this->game->resolveTurnBonus($activePlayerId);

        if ($result['pattern'] === '3') {
            $this->bga->playerStats->inc('pattern3', 1, $activePlayerId);
        } elseif ($result['pattern'] === '21') {
            $this->bga->playerStats->inc('pattern21', 1, $activePlayerId);
        } else {
            $this->bga->playerStats->inc('pattern111', 1, $activePlayerId);
        }

        $this->bga->notify->all('resolveBonus', clienttranslate('${player_name} resolves a bonus'), [
            'player_id' => $activePlayerId,
            'player_name' => $this->game->getPlayerNameById($activePlayerId),
            'pattern' => $result['pattern'],
            'basketFull' => $result['basketFull'],
            'handCount' => count($this->game->getHandForPlayer($activePlayerId)),
            'tomatoDeckCount' => $this->game->getTomatoDeckCount(),
            'publicDiscardCount' => $this->game->getPublicDiscardCount(),
            'latestDiscardTomato' => $this->game->getLatestDiscardTomato(),
        ]);
        if ($result['bonusCard'] !== null) {
            $this->bga->notify->player($activePlayerId, 'privateHandUpdate', '', [
                'player_id' => $activePlayerId,
                'mode' => 'bonus',
                'bonusCard' => $result['bonusCard'],
                'recycledTomatoDiscard' => $result['bonusCard']['recycledTomatoDiscard'] ?? false,
                'playerHand' => $this->game->getHandForPlayer($activePlayerId),
            ]);
        }

        return $this->game->shouldEnterDiscardDown($activePlayerId) ? DiscardDown::class : NextPlayer::class;
    }
}
