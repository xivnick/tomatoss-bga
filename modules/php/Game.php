<?php
/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * tomatoss implementation : © <Your name here> <Your email address here>
 *
 * This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
 * See http://en.boardgamearena.com/#!doc/Studio for more information.
 * -----
 */
declare(strict_types=1);

namespace Bga\Games\tomatoss;

use Bga\Games\tomatoss\States\PlayerTurn;

class Game extends \Bga\GameFramework\Table
{
    private const G_TURN_NO = 'turnNo';
    private const G_ACTION_INDEX = 'actionIndex';
    private const G_START_PLAYER_ID = 'startPlayerId';

    public function __construct()
    {
        parent::__construct();

        $this->initGameStateLabels([
            self::G_TURN_NO => 10,
            self::G_ACTION_INDEX => 11,
            self::G_START_PLAYER_ID => 12,
        ]);
    }

    public function getGameProgression()
    {
        // TODO: replace with target-deck based progression.
        return 0;
    }

    public function upgradeTableDb($from_version)
    {
        unset($from_version);
    }

    protected function getAllDatas(int $currentPlayerId): array
    {
        return [
            'players' => $this->getCollectionFromDb(
                'SELECT '
                . '`player_id` AS `id`, '
                . '`player_score` AS `score`, '
                . '`player_basket_full` AS `basketFull`, '
                . '`player_captured_count` AS `capturedCount` '
                . 'FROM `player`'
            ),
            'turnNo' => $this->getTurnNo(),
            'placementsRemaining' => $this->getPlacementsRemaining(),
            'boardTomatoes' => $this->getBoardTomatoSlots(),
            'boardTargets' => $this->getBoardTargetSlots(),
            'publicDiscardCount' => $this->getPublicDiscardCount(),
            'playerHand' => $this->getHandForPlayer($currentPlayerId),
            'currentTurnActions' => $this->getCurrentTurnActionLog(),
        ];
    }

    protected function setupNewGame($players, $options = [])
    {
        unset($options);

        $gameinfos = $this->getGameinfos();
        $default_colors = $gameinfos['player_colors'];
        $query_values = [];
        $start_order = 0;

        foreach ($players as $player_id => $player) {
            $query_values[] = vsprintf("(%s, '%s', '%s', %s)", [
                $player_id,
                array_shift($default_colors),
                addslashes($player['player_name']),
                $start_order,
            ]);
            $start_order += 1;
        }

        static::DbQuery(
            sprintf(
                'INSERT INTO `player` (`player_id`, `player_color`, `player_name`, `player_start_order`) VALUES %s',
                implode(',', $query_values)
            )
        );

        $this->reattributeColorsBasedOnPreferences($players, $gameinfos['player_colors']);
        $this->reloadPlayersBasicInfos();

        $firstPlayerId = (int) $this->activeNextPlayer();
        $this->setGameStateInitialValue(self::G_TURN_NO, 1);
        $this->setGameStateInitialValue(self::G_ACTION_INDEX, 0);
        $this->setGameStateInitialValue(self::G_START_PLAYER_ID, $firstPlayerId);

        $this->bga->playerStats->init([
            'tomatoCollected',
            'normalTosses',
            'quickTossAttempts',
            'quickTossSuccesses',
            'pattern111',
            'pattern21',
            'pattern3',
        ], 0);

        // TODO: create decks, deal hands, populate center slots.
        return PlayerTurn::class;
    }

    public function debug_goToState(int $state = 3)
    {
        $this->gamestate->jumpToState($state);
    }

    public function debug_playOneMove()
    {
        $this->bga->debug->playUntil(fn(int $count) => $count == 1);
    }

    public function getTurnNo(): int
    {
        return (int) $this->getGameStateValue(self::G_TURN_NO);
    }

    public function getActionIndex(): int
    {
        return (int) $this->getGameStateValue(self::G_ACTION_INDEX);
    }

    public function getPlacementsRemaining(): int
    {
        return max(0, 3 - $this->getActionIndex());
    }

    public function recordTurnAction(
        int $playerId,
        int $space,
        string $actionKind,
        array $cards = [],
        bool $quickToss = false,
        ?int $revealedCard = null,
        int $scoreGained = 0,
    ): void {
        $cardsJson = addslashes((string) json_encode(array_values($cards)));
        $turnNo = $this->getTurnNo();
        $actionIndex = $this->getActionIndex() + 1;
        $actionKindSql = addslashes($actionKind);

        static::DbQuery(
            "INSERT INTO `turn_action` "
            . "(`turn_no`, `player_id`, `action_index`, `space`, `action_kind`, `cards_json`, `quick_toss`, `revealed_card`, `score_gained`) VALUES "
            . "($turnNo, $playerId, $actionIndex, $space, '$actionKindSql', '$cardsJson', " . ($quickToss ? 1 : 0) . ', '
            . ($revealedCard === null ? 'NULL' : (string) $revealedCard) . ", $scoreGained)"
        );

        $this->setGameStateValue(self::G_ACTION_INDEX, $actionIndex);
    }

    public function finishTurnAndAdvance(): string
    {
        $this->setGameStateValue(self::G_ACTION_INDEX, 0);
        $this->setGameStateValue(self::G_TURN_NO, $this->getTurnNo() + 1);

        $nextPlayerId = (int) $this->activeNextPlayer();
        $this->giveExtraTime($nextPlayerId);

        return PlayerTurn::class;
    }

    public function shouldResolveBonus(): bool
    {
        return $this->getActionIndex() >= 3;
    }

    public function shouldEnterDiscardDown(int $playerId): bool
    {
        unset($playerId);
        // TODO: replace with real hand-size check once cards are wired.
        return false;
    }

    public function isGameEndPending(): bool
    {
        // TODO: replace with target-deck depletion check.
        return false;
    }

    public function getBoardTomatoSlots(): array
    {
        // TODO: fetch tomato slots from the deck table.
        return [null, null, null];
    }

    public function getBoardTargetSlots(): array
    {
        // TODO: fetch target slots from the deck table.
        return [null, null, null];
    }

    public function getPublicDiscardCount(): int
    {
        // TODO: fetch discard size from the deck table.
        return 0;
    }

    public function getHandForPlayer(int $playerId): array
    {
        unset($playerId);
        // TODO: fetch hidden hand cards for the requesting player only.
        return [];
    }

    public function getCurrentTurnActionLog(): array
    {
        return array_values($this->getCollectionFromDb(
            'SELECT '
            . '`turn_action_id` AS `id`, '
            . '`player_id` AS `playerId`, '
            . '`action_index` AS `actionIndex`, '
            . '`space`, '
            . '`action_kind` AS `actionKind`, '
            . '`cards_json` AS `cardsJson`, '
            . '`quick_toss` AS `quickToss`, '
            . '`revealed_card` AS `revealedCard`, '
            . '`score_gained` AS `scoreGained` '
            . 'FROM `turn_action` '
            . 'WHERE `turn_no` = ' . $this->getTurnNo() . ' '
            . 'ORDER BY `action_index` ASC'
        ));
    }
}
