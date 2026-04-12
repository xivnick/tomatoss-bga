<?php
/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * tomatoss implementation : © xivnick
 * -----
 */
declare(strict_types=1);

namespace Bga\Games\tomatoss;

use Bga\Games\tomatoss\States\PlayerTurn;

class Game extends \Bga\GameFramework\Table
{
    private bool $tomatoDiscardRecycledOnLastDraw = false;

    private const G_TURN_NO = 'turnNo';
    private const G_ACTION_INDEX = 'actionIndex';
    private const G_START_PLAYER_ID = 'startPlayerId';
    private const G_END_AFTER_TURN = 'endAfterTurn';

    private const TOMATO_CARD_COUNTS = [
        1 => 3,
        2 => 3,
        3 => 13,
        4 => 5,
        5 => 8,
        6 => 4,
        7 => 4,
    ];

    private const TARGET_DEFS = [
        1 => ['desc' => '[card] = 3', 'base' => 2, 'toss' => 3],
        2 => ['desc' => '[card] = 3', 'base' => 2, 'toss' => 3],
        3 => ['desc' => '[card] = [card]', 'base' => 3, 'toss' => 6],
        4 => ['desc' => '[card] = [card]', 'base' => 3, 'toss' => 6],
        5 => ['desc' => '[card] = [card] < [card]', 'base' => 5, 'toss' => 7],
        6 => ['desc' => '[card] = [card] = [card]', 'base' => 5, 'toss' => 10],
        7 => ['desc' => '[card] = 5/6/7', 'base' => 2, 'toss' => 3],
        8 => ['desc' => '[card] = 5/6/7', 'base' => 2, 'toss' => 3],
        9 => ['desc' => '[card] = 1/2', 'base' => 3, 'toss' => 6],
        10 => ['desc' => '[SUM] = 8~9', 'base' => 4, 'toss' => 6],
        11 => ['desc' => '[SUM] = 8~9', 'base' => 4, 'toss' => 6],
        12 => ['desc' => '(3X) [SUM] = 8~9', 'base' => 4, 'toss' => 8],
        13 => ['desc' => '[card] = 6/7', 'base' => 3, 'toss' => 5],
        14 => ['desc' => '[card] - [card] = 1', 'base' => 4, 'toss' => 5],
        15 => ['desc' => '[card] - [card] = 1', 'base' => 4, 'toss' => 5],
        16 => ['desc' => '[SUM] = 11~13', 'base' => 4, 'toss' => 6],
        17 => ['desc' => '[SUM] = 11~13', 'base' => 4, 'toss' => 6],
        18 => ['desc' => '(3X) [SUM] = 11~13', 'base' => 4, 'toss' => 7],
        19 => ['desc' => '[card] = 2/4/6', 'base' => 2, 'toss' => 4],
        20 => ['desc' => '[card] = 2/4/6', 'base' => 2, 'toss' => 4],
        21 => ['desc' => '[SUM] = 6~8', 'base' => 3, 'toss' => 4],
        22 => ['desc' => '[SUM] = 6~8', 'base' => 3, 'toss' => 4],
        23 => ['desc' => '(3X) [SUM] = 6~8', 'base' => 3, 'toss' => 6],
        24 => ['desc' => '[card] + [card] = 10', 'base' => 4, 'toss' => 8],
        25 => ['desc' => '[card] = 4/5', 'base' => 2, 'toss' => 3],
        26 => ['desc' => '[card] = 5', 'base' => 2, 'toss' => 5],
        27 => ['desc' => '[SUM] = 7~11', 'base' => 3, 'toss' => 3],
        28 => ['desc' => '(3X) [SUM] = 7~11', 'base' => 3, 'toss' => 5],
        29 => ['desc' => '[card] - [card] = 4~6', 'base' => 4, 'toss' => 5],
        30 => ['desc' => '[card] - [card] = 4~6', 'base' => 4, 'toss' => 5],
    ];

    public function __construct()
    {
        parent::__construct();

        $this->initGameStateLabels([
            self::G_TURN_NO => 10,
            self::G_ACTION_INDEX => 11,
            self::G_START_PLAYER_ID => 12,
            self::G_END_AFTER_TURN => 13,
        ]);
    }

    public function getGameProgression()
    {
        $totalTargets = (int) $this->getUniqueValueFromDb("SELECT COUNT(*) FROM `card` WHERE `card_type` = 'target'");
        if ($totalTargets === 0) {
            return 0;
        }

        $captured = (int) $this->getUniqueValueFromDb(
            "SELECT COUNT(*) FROM `card` WHERE `card_type` = 'target' AND `card_location` IN ('captured_normal', 'captured_quick')"
        );

        return (int) round($captured / $totalTargets * 100);
    }

    public function upgradeTableDb($from_version)
    {
        unset($from_version);

        if (!$this->tableExists('card')) {
            // NOI18N
            static::DbQuery(
                "CREATE TABLE IF NOT EXISTS `card` (" // NOI18N
                . "`card_id` INT UNSIGNED NOT NULL AUTO_INCREMENT," // NOI18N
                . "`card_type` VARCHAR(16) NOT NULL," // NOI18N
                . "`card_type_arg` INT NOT NULL,"
                . "`card_location` VARCHAR(32) NOT NULL," // NOI18N
                . "`card_location_arg` INT NOT NULL DEFAULT 0,"
                . "`card_hand_index` INT NOT NULL DEFAULT 0,"
                . "PRIMARY KEY (`card_id`)," // NOI18N
                . "KEY `card_location` (`card_location`, `card_location_arg`)" // NOI18N
                . ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=1"
            );
        }

        if (!$this->columnExists('card', 'card_hand_index')) {
            static::DbQuery("ALTER TABLE `card` ADD `card_hand_index` INT NOT NULL DEFAULT 0 AFTER `card_location_arg`");
            $handCards = array_values($this->getCollectionFromDb(
                "SELECT `card_id` AS `id`, `card_location_arg` AS `playerId` "
                . "FROM `card` WHERE `card_type` = 'tomato' AND `card_location` = 'hand' "
                . "ORDER BY `card_location_arg` ASC, `card_id` ASC"
            ));
            $nextIndexByPlayer = [];
            foreach ($handCards as $card) {
                $playerId = (int) $card['playerId'];
                $nextIndex = $nextIndexByPlayer[$playerId] ?? 0;
                static::DbQuery(
                    "UPDATE `card` SET `card_hand_index` = $nextIndex WHERE `card_id` = " . (int) $card['id']
                );
                $nextIndexByPlayer[$playerId] = $nextIndex + 1;
            }
        }

        $this->ensurePlayerColumn('player_basket_full', "ALTER TABLE `player` ADD `player_basket_full` TINYINT(1) NOT NULL DEFAULT 1");
        $this->ensurePlayerColumn('player_start_order', "ALTER TABLE `player` ADD `player_start_order` TINYINT UNSIGNED NOT NULL DEFAULT 0");
        $this->ensurePlayerColumn('player_captured_count', "ALTER TABLE `player` ADD `player_captured_count` SMALLINT UNSIGNED NOT NULL DEFAULT 0");

        if (!$this->tableExists('turn_action')) {
            // NOI18N
            static::DbQuery(
                "CREATE TABLE IF NOT EXISTS `turn_action` (" // NOI18N
                . "`turn_action_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,"
                . "`turn_no` INT UNSIGNED NOT NULL,"
                . "`player_id` INT UNSIGNED NOT NULL,"
                . "`action_index` TINYINT UNSIGNED NOT NULL,"
                . "`space` TINYINT UNSIGNED NOT NULL,"
                . "`action_kind` VARCHAR(16) NOT NULL," // NOI18N
                . "`cards_json` VARCHAR(64) NOT NULL DEFAULT '[]'," // NOI18N
                . "`quick_toss` TINYINT(1) NOT NULL DEFAULT 0,"
                . "`target_id` TINYINT UNSIGNED DEFAULT NULL,"
                . "`revealed_card` TINYINT UNSIGNED DEFAULT NULL,"
                . "`score_gained` SMALLINT NOT NULL DEFAULT 0,"
                . "PRIMARY KEY (`turn_action_id`)," // NOI18N
                . "KEY `turn_no_player` (`turn_no`, `player_id`)" // NOI18N
                . ") ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=1"
            );
            return;
        }

        if (!$this->columnExists('turn_action', 'target_id')) {
            static::DbQuery("ALTER TABLE `turn_action` ADD `target_id` TINYINT UNSIGNED DEFAULT NULL AFTER `quick_toss`");
        }
        if (!$this->columnExists('turn_action', 'revealed_card')) {
            static::DbQuery("ALTER TABLE `turn_action` ADD `revealed_card` TINYINT UNSIGNED DEFAULT NULL AFTER `target_id`");
        }
        if (!$this->columnExists('turn_action', 'score_gained')) {
            static::DbQuery("ALTER TABLE `turn_action` ADD `score_gained` SMALLINT NOT NULL DEFAULT 0 AFTER `revealed_card`");
        }
    }

    protected function getAllDatas(int $currentPlayerId): array
    {
        return [
            'viewerPlayerId' => $currentPlayerId,
            // NOI18N
            'players' => $this->getCollectionFromDb(
                'SELECT ' // NOI18N
                . '`player_id` AS `id`, ' // NOI18N
                . '`player_name` AS `name`, ' // NOI18N
                . '`player_color` AS `color`, ' // NOI18N
                . '`player_score` AS `score`, ' // NOI18N
                . '`player_basket_full` AS `basketFull`, ' // NOI18N
                . '`player_captured_count` AS `capturedCount` ' // NOI18N
                . 'FROM `player`' // NOI18N
            ),
            'turnNo' => $this->getTurnNo(),
            'placementsRemaining' => $this->getPlacementsRemaining(),
            'boardTomatoes' => $this->getBoardTomatoSlots(),
            'boardTargets' => $this->getBoardTargetSlots(),
            'publicDiscardCount' => $this->getPublicDiscardCount(),
            'latestDiscardTomato' => $this->getLatestDiscardTomato(),
            'discardTomatoes' => $this->getTomatoDiscardCards(),
            'targetDeckCount' => $this->getTargetDeckCount(),
            'tomatoDeckCount' => $this->getTomatoDeckCount(),
            'playerHand' => $this->getHandForPlayer($currentPlayerId),
            'handCountsByPlayer' => $this->getHandCountsByPlayer(),
            'currentTurnActions' => $this->getCurrentTurnActionLog(),
            'capturedTargetsByPlayer' => $this->getCapturedTargetsByPlayer(),
            'turnOrderPlayerIds' => $this->getCurrentTurnOrderPlayerIds(),
        ];
    }

    protected function setupNewGame($players, $options = [])
    {
        unset($options);

        $gameinfos = $this->getGameinfos();
        $default_colors = $gameinfos['player_colors'];
        $queryValues = [];
        $startOrder = 0;

        foreach ($players as $playerId => $player) {
            // NOI18N
            $queryValues[] = vsprintf("(%s, '%s', '%s', %s)", [ // NOI18N
                $playerId,
                array_shift($default_colors),
                addslashes($player['player_name']),
                $startOrder,
            ]);
            $startOrder += 1;
        }

        static::DbQuery(
            sprintf(
                'INSERT INTO `player` (`player_id`, `player_color`, `player_name`, `player_start_order`) VALUES %s',
                implode(',', $queryValues)
            )
        );

        $this->reattributeColorsBasedOnPreferences($players, $gameinfos['player_colors']);
        $this->reloadPlayersBasicInfos();
        $this->bga->playerScore->setAll(0, null);

        $firstPlayerId = (int) $this->activeNextPlayer();
        $this->setGameStateInitialValue(self::G_TURN_NO, 1);
        $this->setGameStateInitialValue(self::G_ACTION_INDEX, 0);
        $this->setGameStateInitialValue(self::G_END_AFTER_TURN, 0);
        $this->setGameStateInitialValue(self::G_START_PLAYER_ID, $firstPlayerId);

        $this->bga->tableStats->init([
            'totalNormalTosses',
            'totalQuickTosses',
            'totalFailedTosses',
            'totalBonusCardsDrawn',
            'timesTomatoDiscardRecycled',
        ], 0);

        $this->bga->playerStats->init([
            'tomatoCollected',
            'normalTosses',
            'quickTossAttempts',
            'quickTossSuccesses',
            'quickTossSuccessRate',
            'pattern111',
            'pattern21',
            'pattern3',
            'pointsFromNormalToss',
            'pointsFromQuickToss',
            'failedQuickTosses',
            'bonusCardsDrawn',
            'targetsCaptured',
            'tomatoesDiscarded',
        ], 0);

        $this->seedTomatoDeck();
        $this->seedTargetDeck(count($players));
        $this->dealStartingHands($this->getPlayerIdsInTurnOrder($players, $firstPlayerId));
        $this->fillInitialBoardSlots();

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

    public function assertCanCollectTomato(int $slot): void
    {
        if ($this->getPlacementsRemaining() <= 0) {
            throw new \Bga\GameFramework\UserException(clienttranslate('No placements remaining this turn'));
        }

        if ($slot < 0 || $slot > 2) {
            throw new \Bga\GameFramework\UserException(clienttranslate('Invalid tomato slot'));
        }

        $exists = (int) $this->getUniqueValueFromDb(
            "SELECT COUNT(*) FROM `card` WHERE `card_type` = 'tomato' AND `card_location` = 'board_tomato' AND `card_location_arg` = $slot"
        );
        if ($exists === 0) {
            throw new \Bga\GameFramework\UserException(clienttranslate('That tomato slot is empty'));
        }
    }

    public function assertCanTossToTarget(int $playerId, int $slot, array $cardIds, bool $quickToss): void
    {
        if ($this->getPlacementsRemaining() <= 0) {
            throw new \Bga\GameFramework\UserException(clienttranslate('No placements remaining this turn'));
        }

        if ($slot < 3 || $slot > 5) {
            throw new \Bga\GameFramework\UserException(clienttranslate('Invalid target slot'));
        }

        $targetSlot = $slot - 3;
        $targetCard = $this->getObjectFromDb(
            "SELECT `card_type_arg` AS `targetId` FROM `card` WHERE `card_type` = 'target' AND `card_location` = 'board_target' AND `card_location_arg` = $targetSlot"
        );
        if (!$targetCard) {
            throw new \Bga\GameFramework\UserException(clienttranslate('That target slot is empty'));
        }

        $selectedCards = $this->loadPlayerHandCardsByIds($playerId, $cardIds);
        $values = array_map(static fn(array $card): int => (int) $card['value'], $selectedCards);
        $targetId = (int) $targetCard['targetId'];

        if ($quickToss) {
            foreach (range(1, 7) as $nextCard) {
                $checkCards = $values;
                $checkCards[] = $nextCard;
                if ($this->targetMatches($targetId, $checkCards)) {
                    return;
                }
            }
            throw new \Bga\GameFramework\UserException(clienttranslate('That quick toss cannot succeed with any reveal card'));
        }

        if (!$this->targetMatches($targetId, $values)) {
            throw new \Bga\GameFramework\UserException(clienttranslate('Selected cards do not satisfy the target'));
        }
    }

    public function getDiscardCountNeeded(int $playerId): int
    {
        $handSize = (int) $this->getUniqueValueFromDb(
            'SELECT COUNT(*) FROM `card` '
            . "WHERE `card_type` = 'tomato' AND `card_location` = 'hand' AND `card_location_arg` = $playerId"
        );

        return max(0, $handSize - 8);
    }

    public function assertCanDiscard(int $playerId, array $cardIds): void
    {
        if (!$this->shouldEnterDiscardDown($playerId)) {
            throw new \Bga\GameFramework\UserException(clienttranslate('You do not need to discard now'));
        }

        $needed = $this->getDiscardCountNeeded($playerId);
        $uniqueCardIds = array_values(array_unique(array_map('intval', $cardIds)));
        if (count($uniqueCardIds) !== $needed) {
            throw new \Bga\GameFramework\UserException(clienttranslate('Select exactly the required number of cards to discard'));
        }

        if ($uniqueCardIds === []) {
            throw new \Bga\GameFramework\UserException(clienttranslate('Invalid hand selection'));
        }

        $rows = $this->getCollectionFromDb(
            "SELECT `card_id` AS `id` FROM `card` "
            . "WHERE `card_type` = 'tomato' AND `card_location` = 'hand' AND `card_location_arg` = $playerId "
            . 'AND `card_id` IN (' . implode(',', $uniqueCardIds) . ')'
        );
        if (count($rows) !== $needed) {
            throw new \Bga\GameFramework\UserException(clienttranslate('You do not have that card'));
        }
    }

    public function recordTurnAction(
        int $playerId,
        int $space,
        string $actionKind,
        array $cards = [],
        bool $quickToss = false,
        ?int $targetId = null,
        ?int $revealedCard = null,
        int $scoreGained = 0,
    ): void {
        $cardsJson = addslashes((string) json_encode(array_values($cards)));
        $turnNo = $this->getTurnNo();
        $actionIndex = $this->getActionIndex() + 1;
        $actionKindSql = addslashes($actionKind);

        // NOI18N
        static::DbQuery(
            "INSERT INTO `turn_action` "
            . "(`turn_no`, `player_id`, `action_index`, `space`, `action_kind`, `cards_json`, `quick_toss`, `target_id`, `revealed_card`, `score_gained`) VALUES " // NOI18N
            . "($turnNo, $playerId, $actionIndex, $space, '$actionKindSql', '$cardsJson', " . ($quickToss ? 1 : 0) . ', '
            . ($targetId === null ? 'NULL' : (string) $targetId) . ', '
            . ($revealedCard === null ? 'NULL' : (string) $revealedCard) . ", $scoreGained)"
        );

        $this->setGameStateValue(self::G_ACTION_INDEX, $actionIndex);
    }

    public function finishTurnAndAdvance(): string
    {
        static::DbQuery('DELETE FROM `turn_action`');
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
        $handSize = (int) $this->getUniqueValueFromDb(
            'SELECT COUNT(*) FROM `card` '
            . "WHERE `card_type` = 'tomato' AND `card_location` = 'hand' AND `card_location_arg` = $playerId"
        );
        return $handSize > 8;
    }

    public function isGameEndPending(): bool
    {
        return (int) $this->getGameStateValue(self::G_END_AFTER_TURN) === 1;
    }

    public function getBoardTomatoSlots(): array
    {
        $rows = $this->getCollectionFromDb(
            "SELECT `card_id` AS `id`, `card_type_arg` AS `value`, `card_location_arg` AS `slot` "
            . "FROM `card` WHERE `card_type` = 'tomato' AND `card_location` = 'board_tomato'"
        );

        $slots = [null, null, null];
        foreach ($rows as $row) {
            $slots[(int) $row['slot']] = [
                'id' => (int) $row['id'],
                'value' => (int) $row['value'],
            ];
        }

        return $slots;
    }

    public function getBoardTargetSlots(): array
    {
        $rows = $this->getCollectionFromDb(
            "SELECT `card_id` AS `id`, `card_type_arg` AS `targetId`, `card_location_arg` AS `slot` "
            . "FROM `card` WHERE `card_type` = 'target' AND `card_location` = 'board_target'"
        );

        $slots = [null, null, null];
        foreach ($rows as $row) {
            $slots[(int) $row['slot']] = $this->buildTargetData((int) $row['id'], (int) $row['targetId']);
        }

        return $slots;
    }

    public function getPublicDiscardCount(): int
    {
        return $this->getCardCount('tomato', 'tomato_discard');
    }

    public function getLatestDiscardTomato(): ?array
    {
        $row = $this->getObjectFromDb(
            "SELECT `card_id` AS `id`, `card_type_arg` AS `value` "
            . "FROM `card` WHERE `card_type` = 'tomato' AND `card_location` = 'tomato_discard' "
            . 'ORDER BY `card_location_arg` DESC LIMIT 1'
        );

        if (!$row) {
            return null;
        }

        return [
            'id' => (int) $row['id'],
            'value' => (int) $row['value'],
        ];
    }

    public function getTomatoDiscardCards(): array
    {
        $rows = array_values($this->getCollectionFromDb(
            "SELECT `card_id` AS `id`, `card_type_arg` AS `value` "
            . "FROM `card` WHERE `card_type` = 'tomato' AND `card_location` = 'tomato_discard' "
            . 'ORDER BY `card_location_arg` DESC'
        ));

        return array_map(static fn(array $row): array => [
            'id' => (int) $row['id'],
            'value' => (int) $row['value'],
        ], $rows);
    }

    public function getTargetDeckCount(): int
    {
        return $this->getCardCount('target', 'target_deck');
    }

    public function getTomatoDeckCount(): int
    {
        return $this->getCardCount('tomato', 'tomato_deck');
    }

    public function getHandForPlayer(int $playerId): array
    {
        $rows = $this->getCollectionFromDb(
            "SELECT `card_id` AS `id`, `card_type_arg` AS `value` "
            . "FROM `card` WHERE `card_type` = 'tomato' AND `card_location` = 'hand' AND `card_location_arg` = $playerId "
            . 'ORDER BY `card_hand_index` ASC, `card_id` ASC'
        );

        return array_map(static fn(array $row): array => [
            'id' => (int) $row['id'],
            'value' => (int) $row['value'],
        ], array_values($rows));
    }

    public function getCurrentTurnActionLog(): array
    {
        // NOI18N
        return array_values($this->getCollectionFromDb(
            'SELECT ' // NOI18N
            . '`turn_action_id` AS `id`, ' // NOI18N
            . '`player_id` AS `playerId`, ' // NOI18N
            . '`action_index` AS `actionIndex`, ' // NOI18N
            . '`space`, ' // NOI18N
            . '`action_kind` AS `actionKind`, ' // NOI18N
            . '`cards_json` AS `cardsJson`, ' // NOI18N
            . '`quick_toss` AS `quickToss`, ' // NOI18N
            . '`target_id` AS `targetId`, ' // NOI18N
            . '`revealed_card` AS `revealedCard`, ' // NOI18N
            . '`score_gained` AS `scoreGained` ' // NOI18N
            . 'FROM `turn_action` ' // NOI18N
            . 'WHERE `turn_no` = ' . $this->getTurnNo() . ' '
            . 'ORDER BY `action_index` ASC'
        ));
    }

    public function getHandCountsByPlayer(): array
    {
        // NOI18N
        $rows = array_values($this->getCollectionFromDb(
            "SELECT `card_location_arg` AS `playerId`, COUNT(*) AS `handCount` " // NOI18N
            . "FROM `card` WHERE `card_type` = 'tomato' AND `card_location` = 'hand' " // NOI18N
            . 'GROUP BY `card_location_arg`' // NOI18N
        ));

        $result = [];
        foreach ($rows as $row) {
            $result[(int) $row['playerId']] = (int) $row['handCount'];
        }

        return $result;
    }

    public function resolveTurnBonus(int $playerId): array
    {
        $actions = $this->getCurrentTurnActionLog();
        $spaces = array_map(static fn(array $action): int => (int) $action['space'], $actions);
        $counts = array_count_values($spaces);

        $result = [
            'pattern' => '111',
            'bonusCard' => null,
            'basketFull' => $this->isBasketFull($playerId),
        ];

        if (in_array(3, $counts, true)) {
            $result['pattern'] = '3';
            $bonusCard = $this->drawCard('tomato', 'tomato_deck', 'hand', $playerId);
            if ($bonusCard !== null) {
                $result['bonusCard'] = [
                    'id' => (int) $bonusCard['id'],
                    'value' => (int) $bonusCard['typeArg'],
                    'recycledTomatoDiscard' => $bonusCard['recycledTomatoDiscard'] ?? false,
                ];
            }
        } elseif (in_array(2, $counts, true)) {
            $result['pattern'] = '21';
            if ($this->isBasketFull($playerId)) {
                $this->setBasketFull($playerId, false);
                $bonusCard = $this->drawCard('tomato', 'tomato_deck', 'hand', $playerId);
                if ($bonusCard !== null) {
                    $result['bonusCard'] = [
                        'id' => (int) $bonusCard['id'],
                        'value' => (int) $bonusCard['typeArg'],
                        'recycledTomatoDiscard' => $bonusCard['recycledTomatoDiscard'] ?? false,
                    ];
                }
            } else {
                $this->setBasketFull($playerId, true);
            }
            $result['basketFull'] = $this->isBasketFull($playerId);
        }

        return $result;
    }

    public function discardCardsByIds(int $playerId, array $cardIds): array
    {
        $this->assertCanDiscard($playerId, $cardIds);
        $uniqueCardIds = array_values(array_unique(array_map('intval', $cardIds)));
        // NOI18N
        $cards = array_values($this->getCollectionFromDb(
            "SELECT `card_id` AS `id`, `card_type_arg` AS `value` " // NOI18N
            . "FROM `card` " // NOI18N
            . "WHERE `card_type` = 'tomato' AND `card_location` = 'hand' AND `card_location_arg` = $playerId "
            . 'AND `card_id` IN (' . implode(',', $uniqueCardIds) . ') '
            . 'ORDER BY `card_id` ASC'
        ));
        if ($cards === []) {
            throw new \Bga\GameFramework\UserException(clienttranslate('You do not have that card'));
        }

        $discarded = [];
        foreach ($cards as $card) {
            static::DbQuery(
                "UPDATE `card` SET `card_location` = 'tomato_discard', `card_location_arg` = " . $this->getNextDiscardIndex() . " WHERE `card_id` = " . (int) $card['id']
            );

            $discarded[] = [
                'id' => (int) $card['id'],
                'value' => (int) $card['value'],
            ];
        }

        return [
            'discarded' => $discarded,
            'remainingHand' => $this->getHandForPlayer($playerId),
            'publicDiscardCount' => $this->getPublicDiscardCount(),
            'latestDiscardTomato' => $this->getLatestDiscardTomato(),
            'discardTomatoes' => $this->getTomatoDiscardCards(),
        ];
    }

    public function discardCardByValue(int $playerId, int $cardValue): array
    {
        // NOI18N
        $card = $this->getObjectFromDb(
            "SELECT `card_id` AS `id` " // NOI18N
            . "FROM `card` " // NOI18N
            . "WHERE `card_type` = 'tomato' AND `card_location` = 'hand' AND `card_location_arg` = $playerId "
            . "AND `card_type_arg` = $cardValue "
            . 'ORDER BY `card_id` ASC LIMIT 1'
        );
        if (!$card) {
            throw new \Bga\GameFramework\UserException(clienttranslate('You do not have that card'));
        }

        return $this->discardCardsByIds($playerId, [(int) $card['id']]);
    }

    public function finalizeScores(): array
    {
        $scoreByPlayer = $this->bga->playerScore->getAll();
        $players = array_map(
            static fn (int $playerId, int $score): array => [
                'id' => $playerId,
                'score' => $score,
            ],
            array_keys($scoreByPlayer),
            array_values($scoreByPlayer)
        );

        $bestScore = null;
        $bestHandSum = null;
        $winnerIds = [];

        foreach ($players as $player) {
            $playerId = (int) $player['id'];
            $score = (int) $player['score'];
            $handSum = $this->getPlayerHandSum($playerId);

            $this->bga->playerScoreAux->set($playerId, $handSum);

            if ($bestScore === null || $score > $bestScore) {
                $bestScore = $score;
                $bestHandSum = $handSum;
                $winnerIds = [$playerId];
                continue;
            }

            if ($score === $bestScore) {
                if ($bestHandSum === null || $handSum > $bestHandSum) {
                    $bestHandSum = $handSum;
                    $winnerIds = [$playerId];
                } elseif ($handSum === $bestHandSum) {
                    $winnerIds[] = $playerId;
                }
            }
        }

        return [
            'winnerIds' => $winnerIds,
        ];
    }

    public function tossToTarget(int $playerId, int $slot, array $cardIds, bool $quickToss): array
    {
        $this->assertCanTossToTarget($playerId, $slot, $cardIds, $quickToss);
        $targetSlot = $slot - 3;
        $targetCard = $this->getObjectFromDb(
            "SELECT `card_id` AS `id`, `card_type_arg` AS `targetId` "
            . "FROM `card` WHERE `card_type` = 'target' AND `card_location` = 'board_target' AND `card_location_arg` = $targetSlot"
        );
        if (!$targetCard) {
            throw new \Bga\GameFramework\UserException(clienttranslate('That target slot is empty'));
        }

        $selectedCards = $this->loadPlayerHandCardsByIds($playerId, $cardIds);
        $values = array_map(static fn(array $card): int => (int) $card['value'], $selectedCards);

        $revealed = null;
        $checkCards = $values;
        if ($quickToss) {
            $revealed = $this->drawCard('tomato', 'tomato_deck', 'tomato_discard', 0);
            if ($revealed !== null) {
                $checkCards[] = (int) $revealed['typeArg'];
            }
        }
        $recycledTomatoDiscard = $revealed['recycledTomatoDiscard'] ?? false;

        $targetId = (int) $targetCard['targetId'];
        $success = $this->targetMatches($targetId, $checkCards);

        $this->moveCardsToDiscard($cardIds);

        $scoreGained = 0;
        $replacementTarget = null;
        if ($success) {
            $scoreGained = $quickToss ? self::TARGET_DEFS[$targetId]['toss'] : self::TARGET_DEFS[$targetId]['base'];
            $this->bga->playerScore->inc($playerId, $scoreGained);

            static::DbQuery(
                "UPDATE `player` SET `player_captured_count` = `player_captured_count` + 1 WHERE `player_id` = $playerId"
            );
            $capturedLocation = $quickToss ? 'captured_quick' : 'captured_normal';
            static::DbQuery(
                "UPDATE `card` SET `card_location` = '$capturedLocation', `card_location_arg` = $playerId WHERE `card_id` = " . (int) $targetCard['id']
            );

            $replacement = $this->drawCard('target', 'target_deck', 'board_target', $targetSlot);
            if ($replacement !== null) {
                $replacementTarget = $this->buildTargetData((int) $replacement['id'], (int) $replacement['typeArg']);
            } else {
                $this->setGameStateValue(self::G_END_AFTER_TURN, 1);
            }
        }

        return [
            'selectedCards' => $selectedCards,
            'revealed' => $revealed === null ? null : [
                'id' => (int) $revealed['id'],
                'value' => (int) $revealed['typeArg'],
            ],
            'success' => $success,
            'scoreGained' => $scoreGained,
            'targetId' => $targetId,
            'replacementTarget' => $replacementTarget,
            'remainingHand' => $this->getHandForPlayer($playerId),
            'publicDiscardCount' => $this->getPublicDiscardCount(),
            'latestDiscardTomato' => $this->getLatestDiscardTomato(),
            'discardTomatoes' => $this->getTomatoDiscardCards(),
            'targetDeckCount' => $this->getTargetDeckCount(),
            'tomatoDeckCount' => $this->getTomatoDeckCount(),
            'capturedTargetsByPlayer' => $this->getCapturedTargetsByPlayer(),
            'recycledTomatoDiscard' => $recycledTomatoDiscard,
        ];
    }

    public function collectTomatoFromSlot(int $playerId, int $slot): array
    {
        $this->assertCanCollectTomato($slot);
        $card = $this->getObjectFromDb(
            "SELECT `card_id` AS `id`, `card_type_arg` AS `value` "
            . "FROM `card` WHERE `card_type` = 'tomato' AND `card_location` = 'board_tomato' AND `card_location_arg` = $slot"
        );
        if (!$card) {
            throw new \Bga\GameFramework\UserException(clienttranslate('That tomato slot is empty'));
        }

        $cardId = (int) $card['id'];
        $this->moveCardToLocation($cardId, 'hand', $playerId);

        $refill = $this->drawCard('tomato', 'tomato_deck', 'board_tomato', $slot);

        return [
            'collected' => [
                'id' => $cardId,
                'value' => (int) $card['value'],
            ],
            'refill' => $refill === null ? null : [
                'id' => (int) $refill['id'],
                'value' => (int) $refill['typeArg'],
            ],
            'tomatoDeckCount' => $this->getTomatoDeckCount(),
            'publicDiscardCount' => $this->getPublicDiscardCount(),
            'recycledTomatoDiscard' => $refill['recycledTomatoDiscard'] ?? false,
            'latestDiscardTomato' => $this->getLatestDiscardTomato(),
            'discardTomatoes' => $this->getTomatoDiscardCards(),
        ];
    }

    private function seedTomatoDeck(): void
    {
        $cards = [];
        foreach (self::TOMATO_CARD_COUNTS as $value => $count) {
            for ($i = 0; $i < $count; $i += 1) {
                $cards[] = $value;
            }
        }

        shuffle($cards);
        $this->insertDeckCards('tomato', $cards, 'tomato_deck');
    }

    private function seedTargetDeck(int $playerCount): void
    {
        $targetIds = array_keys(self::TARGET_DEFS);
        shuffle($targetIds);

        if ($playerCount === 4) {
            $targetIds = array_slice($targetIds, 0, count($targetIds) - 5);
        } elseif ($playerCount === 2 || $playerCount === 3) {
            $targetIds = array_slice($targetIds, 0, count($targetIds) - 10);
        }

        $this->insertDeckCards('target', array_values($targetIds), 'target_deck');
    }

    private function insertDeckCards(string $cardType, array $typeArgs, string $location): void
    {
        $values = [];
        foreach (array_values($typeArgs) as $index => $typeArg) {
            // NOI18N
            $values[] = sprintf(
                "(NULL, '%s', %d, '%s', %d)", // NOI18N
                addslashes($cardType),
                $typeArg,
                addslashes($location),
                $index
            );
        }

        if ($values === []) {
            return;
        }

        static::DbQuery(
            'INSERT INTO `card` (`card_id`, `card_type`, `card_type_arg`, `card_location`, `card_location_arg`) VALUES '
            . implode(',', $values)
        );
    }

    private function dealStartingHands(array $orderedPlayerIds): void
    {
        foreach ($orderedPlayerIds as $position => $playerId) {
            $handSize = $position + 2;
            for ($i = 0; $i < $handSize; $i += 1) {
                $this->drawCard('tomato', 'tomato_deck', 'hand', $playerId);
            }
        }
    }

    private function fillInitialBoardSlots(): void
    {
        for ($slot = 0; $slot < 3; $slot += 1) {
            $this->drawCard('tomato', 'tomato_deck', 'board_tomato', $slot);
            $this->drawCard('target', 'target_deck', 'board_target', $slot);
        }
    }

    private function drawCard(string $cardType, string $fromLocation, string $toLocation, int $toArg): ?array
    {
        $this->tomatoDiscardRecycledOnLastDraw = false;
        if ($cardType === 'tomato' && $fromLocation === 'tomato_deck') {
            $this->recycleTomatoDiscardIntoDeckIfNeeded();
        }

        // NOI18N
        $card = $this->getObjectFromDb(
            "SELECT `card_id` AS `id`, `card_type_arg` AS `typeArg` " // NOI18N
            . "FROM `card` " // NOI18N
            . "WHERE `card_type` = '" . addslashes($cardType) . "' "
            . "AND `card_location` = '" . addslashes($fromLocation) . "' "
            . 'ORDER BY `card_location_arg` ASC LIMIT 1'
        );

        if (!$card) {
            return null;
        }

        if ($toLocation === 'tomato_discard') {
            $toArg = $this->getNextDiscardIndex();
        }

        $this->moveCardToLocation((int) $card['id'], $toLocation, $toArg);

        return [
            'id' => (int) $card['id'],
            'typeArg' => (int) $card['typeArg'],
            'recycledTomatoDiscard' => $this->tomatoDiscardRecycledOnLastDraw,
        ];
    }

    private function recycleTomatoDiscardIntoDeckIfNeeded(): void
    {
        $deckCount = $this->getCardCount('tomato', 'tomato_deck');
        if ($deckCount > 0) {
            return;
        }

        $discardCards = array_values($this->getCollectionFromDb(
            "SELECT `card_id` AS `id` FROM `card` WHERE `card_type` = 'tomato' AND `card_location` = 'tomato_discard'"
        ));
        if ($discardCards === []) {
            return;
        }

        $this->tomatoDiscardRecycledOnLastDraw = true;
        $this->bga->tableStats->inc('timesTomatoDiscardRecycled', 1);

        shuffle($discardCards);
        foreach ($discardCards as $index => $card) {
            static::DbQuery(
                "UPDATE `card` SET `card_location` = 'tomato_deck', `card_location_arg` = $index WHERE `card_id` = " . (int) $card['id']
            );
        }
    }

    private function loadPlayerHandCardsByIds(int $playerId, array $cardIds): array
    {
        $cardIds = array_values(array_map('intval', $cardIds));
        if ($cardIds === []) {
            return [];
        }

        $sqlIds = implode(',', $cardIds);
        $rows = array_values($this->getCollectionFromDb(
            "SELECT `card_id` AS `id`, `card_type_arg` AS `value` "
            . "FROM `card` WHERE `card_type` = 'tomato' AND `card_location` = 'hand' AND `card_location_arg` = $playerId "
            . "AND `card_id` IN ($sqlIds)"
        ));

        if (count($rows) !== count($cardIds)) {
            throw new \Bga\GameFramework\UserException(clienttranslate('Invalid hand selection'));
        }

        usort($rows, static fn(array $a, array $b): int => (int) $a['id'] <=> (int) $b['id']);
        return array_map(static fn(array $row): array => [
            'id' => (int) $row['id'],
            'value' => (int) $row['value'],
        ], $rows);
    }

    private function moveCardsToDiscard(array $cardIds): void
    {
        foreach (array_values(array_map('intval', $cardIds)) as $cardId) {
            $this->moveCardToLocation($cardId, 'tomato_discard', $this->getNextDiscardIndex());
        }
    }

    private function getNextDiscardIndex(): int
    {
        return (int) $this->getUniqueValueFromDb(
            "SELECT COALESCE(MAX(`card_location_arg`), -1) + 1 FROM `card` WHERE `card_type` = 'tomato' AND `card_location` = 'tomato_discard'"
        );
    }

    private function getNextHandIndex(int $playerId): int
    {
        return (int) $this->getUniqueValueFromDb(
            "SELECT COALESCE(MAX(`card_hand_index`), -1) + 1 FROM `card` "
            . "WHERE `card_type` = 'tomato' AND `card_location` = 'hand' AND `card_location_arg` = $playerId"
        );
    }

    private function getCardCount(string $cardType, string $location): int
    {
        return (int) $this->getUniqueValueFromDb(
            "SELECT COUNT(*) FROM `card` WHERE `card_type` = '" . addslashes($cardType) . "' AND `card_location` = '" . addslashes($location) . "'"
        );
    }

    private function moveCardToLocation(int $cardId, string $location, int $locationArg): void
    {
        $handIndex = $location === 'hand' ? $this->getNextHandIndex($locationArg) : 0;
        static::DbQuery(
            "UPDATE `card` SET `card_location` = '" . addslashes($location) . "', `card_location_arg` = $locationArg, `card_hand_index` = $handIndex "
            . "WHERE `card_id` = $cardId"
        );
    }

    private function buildTargetData(int $cardId, int $targetId): array
    {
        $meta = self::TARGET_DEFS[$targetId];

        return [
            'id' => $cardId,
            'targetId' => $targetId,
            'desc' => $meta['desc'],
            'base' => $meta['base'],
            'toss' => $meta['toss'],
        ];
    }

    private function targetMatches(int $targetId, array $cards): bool
    {
        sort($cards);
        $count = count($cards);
        $sum = array_sum($cards);

        return match ($targetId) {
            1, 2 => $count === 1 && $cards[0] === 3,
            3, 4 => $count === 2 && $cards[0] === $cards[1],
            5 => $count === 3 && $cards[0] === $cards[1] && $cards[1] < $cards[2],
            6 => $count === 3 && $cards[0] === $cards[1] && $cards[1] === $cards[2],
            7, 8 => $count === 1 && in_array($cards[0], [5, 6, 7], true),
            9 => $count === 1 && in_array($cards[0], [1, 2], true),
            10, 11 => 8 <= $sum && $sum <= 9,
            12 => 8 <= $sum && $sum <= 9 && !in_array(3, $cards, true),
            13 => $count === 1 && in_array($cards[0], [6, 7], true),
            14, 15 => $count === 2 && abs($cards[0] - $cards[1]) === 1,
            16, 17 => 11 <= $sum && $sum <= 13,
            18 => 11 <= $sum && $sum <= 13 && !in_array(3, $cards, true),
            19, 20 => $count === 1 && in_array($cards[0], [2, 4, 6], true),
            21, 22 => 6 <= $sum && $sum <= 8,
            23 => 6 <= $sum && $sum <= 8 && !in_array(3, $cards, true),
            24 => $count === 2 && $sum === 10,
            25 => $count === 1 && in_array($cards[0], [4, 5], true),
            26 => $count === 1 && $cards[0] === 5,
            27 => 7 <= $sum && $sum <= 11,
            28 => 7 <= $sum && $sum <= 11 && !in_array(3, $cards, true),
            29, 30 => $count === 2 && 4 <= abs($cards[0] - $cards[1]) && abs($cards[0] - $cards[1]) <= 6,
            default => false,
        };
    }

    private function getPlayerIdsInTurnOrder(array $players, int $firstPlayerId): array
    {
        $playerIds = array_map('intval', array_keys($players));
        $firstIndex = array_search($firstPlayerId, $playerIds, true);
        if ($firstIndex === false) {
            return $playerIds;
        }

        return array_merge(
            array_slice($playerIds, $firstIndex),
            array_slice($playerIds, 0, $firstIndex)
        );
    }

    private function getCurrentTurnOrderPlayerIds(): array
    {
        $rows = array_values($this->getCollectionFromDb(
            "SELECT `player_id` AS `id` FROM `player` ORDER BY `player_start_order` ASC"
        ));
        $players = [];
        foreach ($rows as $row) {
            $players[(int) $row['id']] = true;
        }

        return $this->getPlayerIdsInTurnOrder($players, (int) $this->getGameStateValue(self::G_START_PLAYER_ID));
    }

    private function getPlayerHandSum(int $playerId): int
    {
        return (int) $this->getUniqueValueFromDb(
            "SELECT COALESCE(SUM(`card_type_arg`), 0) FROM `card` "
            . "WHERE `card_type` = 'tomato' AND `card_location` = 'hand' AND `card_location_arg` = $playerId"
        );
    }

    public function getCapturedTargetsByPlayer(): array
    {
        $rows = array_values($this->getCollectionFromDb(
            "SELECT `card_id` AS `id`, `card_type_arg` AS `targetId`, `card_location` AS `location`, `card_location_arg` AS `playerId` "
            . "FROM `card` WHERE `card_type` = 'target' AND `card_location` IN ('captured_normal', 'captured_quick') "
            . 'ORDER BY `card_id` ASC'
        ));

        $result = [];
        foreach ($rows as $row) {
            $playerId = (int) $row['playerId'];
            if (!isset($result[$playerId])) {
                $result[$playerId] = [
                    'normal' => [],
                    'quick' => [],
                ];
            }

            $targetId = (int) $row['targetId'];
            $entry = [
                'id' => (int) $row['id'],
                'targetId' => $targetId,
            ];

            if ($row['location'] === 'captured_quick') {
                $result[$playerId]['quick'][] = $entry;
            } else {
                $result[$playerId]['normal'][] = $entry;
            }
        }

        return $result;
    }

    private function isBasketFull(int $playerId): bool
    {
        return (int) $this->getUniqueValueFromDb(
            "SELECT `player_basket_full` FROM `player` WHERE `player_id` = $playerId"
        ) === 1;
    }

    private function setBasketFull(int $playerId, bool $basketFull): void
    {
        static::DbQuery(
            "UPDATE `player` SET `player_basket_full` = " . ($basketFull ? 1 : 0) . " WHERE `player_id` = $playerId"
        );
    }

    private function tableExists(string $tableName): bool
    {
        return $this->getObjectFromDb("SHOW TABLES LIKE '" . addslashes($tableName) . "'") !== null;
    }

    private function columnExists(string $tableName, string $columnName): bool
    {
        // NOI18N
        return $this->getObjectFromDb(
            "SHOW COLUMNS FROM `" . addslashes($tableName) . "` LIKE '" . addslashes($columnName) . "'" // NOI18N
        ) !== null;
    }

    private function ensurePlayerColumn(string $columnName, string $alterSql): void
    {
        if (!$this->columnExists('player', $columnName)) {
            static::DbQuery($alterSql);
        }
    }
}
