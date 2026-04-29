-- ------
-- BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
-- tomatoss implementation : © xivnick
-- ------

CREATE TABLE IF NOT EXISTS `card` (
  `card_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `card_type` VARCHAR(16) NOT NULL,
  `card_type_arg` INT NOT NULL,
  `card_location` VARCHAR(32) NOT NULL,
  `card_location_arg` INT NOT NULL DEFAULT 0,
  `card_hand_index` INT NOT NULL DEFAULT 0,
  PRIMARY KEY (`card_id`),
  KEY `card_location` (`card_location`, `card_location_arg`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=1;

ALTER TABLE `player`
  ADD `player_basket_full` TINYINT(1) NOT NULL DEFAULT 1,
  ADD `player_start_order` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  ADD `player_captured_count` SMALLINT UNSIGNED NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS `turn_action` (
  `turn_action_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `turn_no` INT UNSIGNED NOT NULL,
  `player_id` INT UNSIGNED NOT NULL,
  `action_index` TINYINT UNSIGNED NOT NULL,
  `space` TINYINT UNSIGNED NOT NULL,
  `action_kind` VARCHAR(16) NOT NULL,
  `cards_json` VARCHAR(64) NOT NULL DEFAULT '[]',
  `quick_toss` TINYINT(1) NOT NULL DEFAULT 0,
  `target_id` TINYINT UNSIGNED DEFAULT NULL,
  `revealed_card` TINYINT UNSIGNED DEFAULT NULL,
  `score_gained` SMALLINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`turn_action_id`),
  KEY `turn_no_player` (`turn_no`, `player_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=1;

CREATE TABLE IF NOT EXISTS `seat_state` (
  `seat_id` INT UNSIGNED NOT NULL,
  `player_id` INT UNSIGNED DEFAULT NULL,
  `seat_name` VARCHAR(64) NOT NULL,
  `seat_color` VARCHAR(16) NOT NULL,
  `seat_start_order` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `is_bot` TINYINT(1) NOT NULL DEFAULT 0,
  `bot_difficulty` TINYINT UNSIGNED DEFAULT NULL,
  `seat_score` INT NOT NULL DEFAULT 0,
  `basket_full` TINYINT(1) NOT NULL DEFAULT 1,
  `captured_count` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`seat_id`),
  KEY `seat_start_order` (`seat_start_order`),
  KEY `player_id` (`player_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `seat_public_collect` (
  `seat_id` INT UNSIGNED NOT NULL,
  `card_value` TINYINT UNSIGNED NOT NULL,
  `card_count` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (`seat_id`, `card_value`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
