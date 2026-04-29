<?php

declare(strict_types=1);

namespace Bga\Games\tomatoss\Bots;

use Bga\Games\tomatoss\Game;

final class BotRunner
{
    public const LEVEL_BEGINNER = 1;
    public const LEVEL_INTERMEDIATE = 2;
    public const LEVEL_ADVANCED = 3;

    private const X = 1.2;
    private const SLOT_REPEAT_BONUS = 0.6;
    private const MISSING_VALUE_BONUS = 0.1;
    private const HIGH_VALUE_BONUS = 0.1;

    private const TOMATO_CARD_COUNTS = [
        1 => 3,
        2 => 3,
        3 => 13,
        4 => 5,
        5 => 8,
        6 => 4,
        7 => 4,
    ];

    private const MEDIUM_QUICK_TOSS_PATTERNS = [
        1 => [[]],
        2 => [[]],
        3 => [[3]],
        4 => [[3]],
        5 => [[1, 1], [2, 2], [3, 3]],
        6 => [[3, 3]],
        7 => [[]],
        8 => [[]],
        9 => [[]],
        10 => [[5]],
        11 => [[5]],
        12 => [[4]],
        13 => [[]],
        14 => [[4]],
        15 => [[4]],
        16 => [[3, 5], [4, 4], [7], [6]],
        17 => [[3, 5], [4, 4], [7], [6]],
        18 => [[7], [6]],
        19 => [[]],
        20 => [[]],
        21 => [[3]],
        22 => [[3]],
        23 => [[]],
        24 => [[7]],
        25 => [[]],
        26 => [[]],
        27 => [[4], [5], [6]],
        28 => [[4], [5], [6]],
        29 => [[7], [1]],
        30 => [[7], [1]],
    ];

    public function __construct(
        private readonly Game $game,
    ) {
    }

    public function chooseTurnAction(int $seatId, int $difficulty): array
    {
        $actions = $this->enumerateTurnActions($seatId);
        if ($actions === []) {
            throw new \RuntimeException('No valid bot turn action');
        }

        return match ($difficulty) {
            self::LEVEL_ADVANCED => $this->chooseAdvancedTurnAction($seatId, $actions),
            self::LEVEL_INTERMEDIATE => $this->chooseIntermediateTurnAction($seatId, $actions),
            default => $actions[array_rand($actions)],
        };
    }

    public function chooseDiscardAction(int $seatId, int $difficulty): array
    {
        $actions = $this->enumerateDiscardActions($seatId);
        if ($actions === []) {
            throw new \RuntimeException('No valid bot discard action');
        }

        return match ($difficulty) {
            self::LEVEL_ADVANCED => $this->chooseAdvancedDiscardAction($seatId, $actions),
            self::LEVEL_INTERMEDIATE => $this->chooseIntermediateDiscardAction($actions),
            default => $actions[array_rand($actions)],
        };
    }

    private function enumerateTurnActions(int $seatId): array
    {
        $actions = [];

        foreach ($this->game->getBoardTomatoSlots() as $slot => $card) {
            if ($card !== null) {
                $actions[] = [
                    'type' => 'collect',
                    'slot' => (int) $slot,
                    'cardIds' => [],
                    'cardValues' => [],
                ];
            }
        }

        $hand = $this->game->getHandForPlayer($seatId);
        $handsByValueKey = $this->enumerateHandSubsets($hand, false);
        $handsByValueKeyWithEmpty = $this->enumerateHandSubsets($hand, true);

        foreach ($this->game->getBoardTargetSlots() as $targetIndex => $target) {
            if ($target === null) {
                continue;
            }

            $slot = $targetIndex + 3;
            $targetId = (int) $target['targetId'];

            foreach ($handsByValueKey as $subset) {
                if ($this->game->matchesTarget($targetId, $subset['values'])) {
                    $actions[] = [
                        'type' => 'normal_toss',
                        'slot' => $slot,
                        'targetId' => $targetId,
                        'cardIds' => $subset['ids'],
                        'cardValues' => $subset['values'],
                    ];
                }
            }

            foreach ($handsByValueKeyWithEmpty as $subset) {
                if ($this->canQuickTossSucceed($targetId, $subset['values'])) {
                    $actions[] = [
                        'type' => 'quick_toss',
                        'slot' => $slot,
                        'targetId' => $targetId,
                        'cardIds' => $subset['ids'],
                        'cardValues' => $subset['values'],
                    ];
                }
            }
        }

        return $actions;
    }

    private function enumerateDiscardActions(int $seatId): array
    {
        $needed = $this->game->getDiscardCountNeeded($seatId);
        $hand = $this->game->getHandForPlayer($seatId);
        if ($needed <= 0 || $hand === []) {
            return [];
        }

        $actions = [];
        $count = count($hand);
        $maxMask = 1 << $count;
        $seen = [];

        for ($mask = 1; $mask < $maxMask; $mask++) {
            if ($this->bitCount($mask) !== $needed) {
                continue;
            }

            $ids = [];
            $values = [];
            for ($index = 0; $index < $count; $index++) {
                if (($mask & (1 << $index)) === 0) {
                    continue;
                }
                $ids[] = (int) $hand[$index]['id'];
                $values[] = (int) $hand[$index]['value'];
            }

            sort($values);
            $key = implode(',', $values);
            if (isset($seen[$key])) {
                continue;
            }
            $seen[$key] = true;

            $actions[] = [
                'type' => 'discard',
                'slot' => 6,
                'cardIds' => $ids,
                'cardValues' => $values,
            ];
        }

        return $actions;
    }

    private function enumerateHandSubsets(array $hand, bool $allowEmpty): array
    {
        $result = [];
        $count = count($hand);
        $maxMask = 1 << $count;
        $startMask = $allowEmpty ? 0 : 1;

        for ($mask = $startMask; $mask < $maxMask; $mask++) {
            $ids = [];
            $values = [];
            for ($index = 0; $index < $count; $index++) {
                if (($mask & (1 << $index)) === 0) {
                    continue;
                }
                $ids[] = (int) $hand[$index]['id'];
                $values[] = (int) $hand[$index]['value'];
            }

            $caps = $this->game->getSubmissionCaps();
            $counts = array_count_values($values);
            $valid = true;
            foreach ($counts as $value => $usedCount) {
                if ($usedCount > ($caps[(int) $value] ?? 0)) {
                    $valid = false;
                    break;
                }
            }
            if (!$valid) {
                continue;
            }

            sort($values);
            $key = implode(',', $values);
            if (!isset($result[$key])) {
                $result[$key] = [
                    'ids' => $ids,
                    'values' => $values,
                ];
            }
        }

        return array_values($result);
    }

    private function canQuickTossSucceed(int $targetId, array $submittedValues): bool
    {
        foreach (range(1, 7) as $nextCard) {
            $cards = $submittedValues;
            $cards[] = $nextCard;
            if ($this->game->matchesTarget($targetId, $cards)) {
                return true;
            }
        }
        return false;
    }

    private function chooseIntermediateTurnAction(int $seatId, array $actions): array
    {
        $normalExists = false;
        $quickMatches = [];
        foreach ($actions as $index => $action) {
            if ($action['type'] === 'normal_toss') {
                $normalExists = true;
                continue;
            }
            if ($action['type'] === 'quick_toss') {
                $rank = $this->getMediumQuickTossRank((int) $action['targetId'], $action['cardValues']);
                if ($rank !== null) {
                    $quickMatches[$index] = $rank;
                }
            }
        }

        $bestQuickRank = $quickMatches === [] ? null : min($quickMatches);
        $weighted = [];
        $slotUsage = $this->getCurrentTurnSlotUsage();
        $handCount = count($this->game->getHandForPlayer($seatId));

        foreach ($actions as $action) {
            if ($action['type'] === 'collect') {
                if ($handCount >= 7 && ($normalExists || $bestQuickRank !== null)) {
                    continue;
                }
                $weight = 1 + $this->slotRepeatWeight((int) $action['slot'], $slotUsage);
                $weighted[] = ['action' => $action, 'weight' => $weight];
                continue;
            }

            if ($action['type'] === 'normal_toss') {
                $weight = 1 + $this->slotRepeatWeight((int) $action['slot'], $slotUsage);
                $weighted[] = ['action' => $action, 'weight' => $weight];
                continue;
            }

            if ($action['type'] === 'quick_toss') {
                $rank = $this->getMediumQuickTossRank((int) $action['targetId'], $action['cardValues']);
                if ($rank === null || $rank !== $bestQuickRank) {
                    continue;
                }
                $weight = 2 + $this->slotRepeatWeight((int) $action['slot'], $slotUsage);
                $weighted[] = ['action' => $action, 'weight' => $weight];
            }
        }

        if ($weighted === []) {
            return $actions[array_rand($actions)];
        }

        return $this->weightedRandomAction($weighted);
    }

    private function chooseAdvancedTurnAction(int $seatId, array $actions): array
    {
        $bestScore = null;
        $bestActions = [];

        foreach ($actions as $action) {
            $score = $this->scoreAdvancedAction($seatId, $action);
            if ($bestScore === null || $score > $bestScore) {
                $bestScore = $score;
                $bestActions = [$action];
                continue;
            }
            if ($score === $bestScore) {
                $bestActions[] = $action;
            }
        }

        return $bestActions[array_rand($bestActions)];
    }

    private function chooseIntermediateDiscardAction(array $actions): array
    {
        $bestSum = null;
        $bestActions = [];
        foreach ($actions as $action) {
            $sum = array_sum($action['cardValues']);
            if ($bestSum === null || $sum < $bestSum) {
                $bestSum = $sum;
                $bestActions = [$action];
                continue;
            }
            if ($sum === $bestSum) {
                $bestActions[] = $action;
            }
        }
        return $bestActions[array_rand($bestActions)];
    }

    private function chooseAdvancedDiscardAction(int $seatId, array $actions): array
    {
        $hand = array_map(static fn(array $card): int => (int) $card['value'], $this->game->getHandForPlayer($seatId));
        $bestPenalty = null;
        $bestActions = [];

        foreach ($actions as $action) {
            $penalty = $this->scoreAdvancedDiscardPenalty($hand, $action['cardValues']);
            if ($bestPenalty === null || $penalty < $bestPenalty) {
                $bestPenalty = $penalty;
                $bestActions = [$action];
                continue;
            }
            if ($penalty === $bestPenalty) {
                $bestActions[] = $action;
            }
        }

        return $bestActions[array_rand($bestActions)];
    }

    private function getMediumQuickTossRank(int $targetId, array $values): ?int
    {
        $patterns = self::MEDIUM_QUICK_TOSS_PATTERNS[$targetId] ?? null;
        if ($patterns === null) {
            return null;
        }

        $sorted = $values;
        sort($sorted);

        foreach ($patterns as $index => $pattern) {
            $candidate = $pattern;
            sort($candidate);
            if ($candidate === $sorted) {
                return $index;
            }
        }

        return null;
    }

    private function slotRepeatWeight(int $slot, array $slotUsage): int
    {
        $count = $slotUsage[$slot] ?? 0;
        return $count >= 1 ? 1 : 0;
    }

    private function getCurrentTurnSlotUsage(): array
    {
        $usage = [];
        foreach ($this->game->getCurrentTurnActionLog() as $action) {
            $space = (int) $action['space'];
            $usage[$space] = ($usage[$space] ?? 0) + 1;
        }
        return $usage;
    }

    private function scoreAdvancedAction(int $seatId, array $action): float
    {
        $slotBonus = $this->slotRepeatBonus((int) $action['slot']);
        if ($action['type'] === 'collect') {
            return $this->scoreAdvancedCollect($seatId, (int) $action['slot']) + $slotBonus;
        }

        if ($action['type'] === 'normal_toss') {
            $target = $this->game->getBoardTargetSlots()[(int) $action['slot'] - 3] ?? null;
            if ($target === null) {
                return -9999.0;
            }
            return (float) $target['base'] - (count($action['cardValues']) * self::X) + $slotBonus;
        }

        $target = $this->game->getBoardTargetSlots()[(int) $action['slot'] - 3] ?? null;
        if ($target === null) {
            return -9999.0;
        }
        $pSuccess = $this->quickSuccessProbability($seatId, (int) $action['targetId'], $action['cardValues']);
        return ((float) $target['toss'] * $pSuccess) - (count($action['cardValues']) * self::X) + $slotBonus;
    }

    private function scoreAdvancedCollect(int $seatId, int $slot): float
    {
        $value = 0.0;
        $hand = $this->game->getHandForPlayer($seatId);
        if (count($hand) <= 6) {
            $value += self::X;
        }

        $card = $this->game->getBoardTomatoSlots()[$slot] ?? null;
        if ($card === null) {
            return $value;
        }

        $handValues = array_map(static fn(array $entry): int => (int) $entry['value'], $hand);
        if (!in_array((int) $card['value'], $handValues, true)) {
            $value += self::MISSING_VALUE_BONUS;
        }
        if (in_array((int) $card['value'], [6, 7], true)) {
            $value += self::HIGH_VALUE_BONUS;
        }

        return $value;
    }

    private function slotRepeatBonus(int $slot): float
    {
        $usage = $this->getCurrentTurnSlotUsage();
        $count = $usage[$slot] ?? 0;
        return $count >= 1 ? self::SLOT_REPEAT_BONUS : 0.0;
    }

    private function quickSuccessProbability(int $seatId, int $targetId, array $submittedValues): float
    {
        $unknown = $this->inferUnknownDrawCounts($seatId, $submittedValues);
        $total = array_sum($unknown);
        if ($total <= 0) {
            return 0.0;
        }

        $success = 0;
        foreach ($unknown as $value => $count) {
            if ($count <= 0) {
                continue;
            }
            $cards = $submittedValues;
            $cards[] = $value;
            if ($this->game->matchesTarget($targetId, $cards)) {
                $success += $count;
            }
        }

        return $success / $total;
    }

    private function inferUnknownDrawCounts(int $seatId, array $submittedValues): array
    {
        $counts = self::TOMATO_CARD_COUNTS;

        foreach ($this->game->getTomatoDiscardCards() as $card) {
            $value = (int) $card['value'];
            $counts[$value] = max(0, $counts[$value] - 1);
        }

        foreach ($this->game->getHandForPlayer($seatId) as $card) {
            $value = (int) $card['value'];
            $counts[$value] = max(0, $counts[$value] - 1);
        }

        foreach ($this->game->getBoardTomatoSlots() as $card) {
            if ($card === null) {
                continue;
            }
            $value = (int) $card['value'];
            $counts[$value] = max(0, $counts[$value] - 1);
        }

        foreach ($this->game->getSeatPublicCollectedCountsMap() as $otherSeatId => $byValue) {
            if ((int) $otherSeatId === $seatId) {
                continue;
            }
            foreach ($byValue as $value => $count) {
                $value = (int) $value;
                $counts[$value] = max(0, $counts[$value] - (int) $count);
            }
        }

        foreach ($submittedValues as $value) {
            $value = (int) $value;
            $counts[$value] = max(0, $counts[$value] - 1);
        }

        return $counts;
    }

    private function scoreAdvancedDiscardPenalty(array $handValues, array $discardValues): float
    {
        $penalty = 0.0;
        foreach ($discardValues as $value) {
            $penalty += $value;
            if (in_array($value, [6, 7], true)) {
                $penalty += 2.0;
            }
        }

        $remaining = $handValues;
        foreach ($discardValues as $value) {
            $index = array_search($value, $remaining, true);
            if ($index !== false) {
                array_splice($remaining, $index, 1);
            }
        }

        $counts = array_count_values($remaining);
        foreach ($counts as $count) {
            if ($count >= 2) {
                $penalty -= 0.4;
            }
        }

        return $penalty;
    }

    private function weightedRandomAction(array $weighted): array
    {
        $total = array_sum(array_map(static fn(array $entry): int => $entry['weight'], $weighted));
        $roll = random_int(1, max(1, $total));
        $running = 0;
        foreach ($weighted as $entry) {
            $running += $entry['weight'];
            if ($roll <= $running) {
                return $entry['action'];
            }
        }
        return $weighted[array_key_last($weighted)]['action'];
    }

    private function bitCount(int $mask): int
    {
        $count = 0;
        while ($mask > 0) {
            $count += $mask & 1;
            $mask >>= 1;
        }
        return $count;
    }
}
