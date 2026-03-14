<?php
/**
 *------
 * BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
 * tomatoss implementation : © <Your name here> <Your email address here>
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
        13 => ['desc' => '[card] = 2/4/6', 'base' => 2, 'toss' => 4],
        14 => ['desc' => '[card] = 2/4/6', 'base' => 2, 'toss' => 4],
        15 => ['desc' => '[SUM] = 6~8', 'base' => 3, 'toss' => 4],
        16 => ['desc' => '[SUM] = 6~8', 'base' => 3, 'toss' => 4],
        17 => ['desc' => '(3X) [SUM] = 6~8', 'base' => 3, 'toss' => 6],
        18 => ['desc' => '[card] + [card] = 10', 'base' => 4, 'toss' => 8],
        19 => ['desc' => '[card] = 6/7', 'base' => 3, 'toss' => 5],
        20 => ['desc' => '[card] - [card] = 1', 'base' => 4, 'toss' => 5],
        21 => ['desc' => '[card] - [card] = 1', 'base' => 4, 'toss' => 5],
        22 => ['desc' => '[SUM] = 11~13', 'base' => 4, 'toss' => 6],
        23 => ['desc' => '[SUM] = 11~13', 'base' => 4, 'toss' => 6],
        24 => ['desc' => '(3X) [SUM] = 11~13', 'base' => 4, 'toss' => 7],
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
        ]);
    }

    public function getGameProgression()
    {
        $totalTargets = (int) $this->getUniqueValueFromDb("SELECT COUNT(*) FROM `card` WHERE `card_type` = 'target'");
        if ($totalTargets === 0) {
            return 0;
        }

        $captured = (int) $this->getUniqueValueFromDb(
            "SELECT COUNT(*) FROM `card` WHERE `card_type` = 'target' AND `card_location` = 'captured'"
        );

        return (int) round($captured / $totalTargets * 100);
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
        $queryValues = [];
        $startOrder = 0;

        foreach ($players as $playerId => $player) {
            $queryValues[] = vsprintf("(%s, '%s', '%s', %s)", [
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
        $handSize = (int) $this->getUniqueValueFromDb(
            'SELECT COUNT(*) FROM `card` '
            . "WHERE `card_type` = 'tomato' AND `card_location` = 'hand' AND `card_location_arg` = $playerId"
        );
        return $handSize > 8;
    }

    public function isGameEndPending(): bool
    {
        $deckCount = (int) $this->getUniqueValueFromDb(
            "SELECT COUNT(*) FROM `card` WHERE `card_type` = 'target' AND `card_location` = 'target_deck'"
        );
        $boardCount = (int) $this->getUniqueValueFromDb(
            "SELECT COUNT(*) FROM `card` WHERE `card_type` = 'target' AND `card_location` = 'board_target'"
        );
        return $deckCount === 0 && $boardCount === 0;
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
            $targetId = (int) $row['targetId'];
            $meta = self::TARGET_DEFS[$targetId];
            $slots[(int) $row['slot']] = [
                'id' => (int) $row['id'],
                'targetId' => $targetId,
                'desc' => $meta['desc'],
                'base' => $meta['base'],
                'toss' => $meta['toss'],
            ];
        }

        return $slots;
    }

    public function getPublicDiscardCount(): int
    {
        return (int) $this->getUniqueValueFromDb(
            "SELECT COUNT(*) FROM `card` WHERE `card_type` = 'tomato' AND `card_location` = 'tomato_discard'"
        );
    }

    public function getHandForPlayer(int $playerId): array
    {
        $rows = $this->getCollectionFromDb(
            "SELECT `card_id` AS `id`, `card_type_arg` AS `value` "
            . "FROM `card` WHERE `card_type` = 'tomato' AND `card_location` = 'hand' AND `card_location_arg` = $playerId "
            . 'ORDER BY `card_id` ASC'
        );

        return array_map(static fn(array $row): array => [
            'id' => (int) $row['id'],
            'value' => (int) $row['value'],
        ], array_values($rows));
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
            $values[] = sprintf(
                "(NULL, '%s', %d, '%s', %d)",
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
        $card = $this->getObjectFromDb(
            "SELECT `card_id` AS `id`, `card_type_arg` AS `typeArg` "
            . "FROM `card` "
            . "WHERE `card_type` = '" . addslashes($cardType) . "' "
            . "AND `card_location` = '" . addslashes($fromLocation) . "' "
            . 'ORDER BY `card_location_arg` ASC LIMIT 1'
        );

        if (!$card) {
            return null;
        }

        static::DbQuery(
            "UPDATE `card` SET `card_location` = '" . addslashes($toLocation) . "', `card_location_arg` = $toArg "
            . 'WHERE `card_id` = ' . (int) $card['id']
        );

        return [
            'id' => (int) $card['id'],
            'typeArg' => (int) $card['typeArg'],
        ];
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
}
