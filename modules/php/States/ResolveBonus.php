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

        $message = '';
        if ($result['pattern'] === '3' && $result['bonusCard'] !== null) {
            $message = clienttranslate('${player_name} resolves 3 in one slot and draws a bonus card');
        } elseif ($result['pattern'] === '21' && $result['bonusCard'] !== null) {
            $message = clienttranslate('${player_name} empties the basket and draws a bonus card');
        } elseif ($result['pattern'] === '21' && $result['basketFull']) {
            $message = clienttranslate('${player_name} fills the basket');
        }

        $this->bga->notify->all(
            'resolveBonus',
            $message,
            [
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
