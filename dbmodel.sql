
-- ------
-- BGA framework: Gregory Isabelli & Emmanuel Colin & BoardGameArena
-- tomatoss implementation : © <Your name here> <Your email address here>
-- 
-- This code has been produced on the BGA studio platform for use on http://boardgamearena.com.
-- See http://en.boardgamearena.com/#!doc/Studio for more information.
-- -----

-- This is the file where you are describing the database schema of your game
-- Basically, you just have to export from PhpMyAdmin your table structure and copy/paste
-- this export here.
-- Note that the database itself and the standard tables ("global", "stats", "gamelog" and "player") are
-- already created and must not be created here

-- Note: The database schema is created from this file when the game starts. If you modify this file,
--       you have to restart a game to see your changes in database.

-- Example 1: create a standard "card" table to be used with the "Deck" tools (see example game "hearts"):

-- CREATE TABLE IF NOT EXISTS `card` (
--   `card_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
--   `card_type` VARCHAR(16) NOT NULL,
--   `card_type_arg` INT NOT NULL,
--   `card_location` VARCHAR(16) NOT NULL,
--   `card_location_arg` INT NOT NULL,
--   PRIMARY KEY (`card_id`)
-- ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 AUTO_INCREMENT=1;


-- Example 2: add a custom field to the standard "player" table
-- ALTER TABLE `player` ADD `player_my_custom_field` INT UNSIGNED NOT NULL DEFAULT 0;

-- Shared card table:
-- - tomato cards use `card_type = 'tomato'`, `card_type_arg = 1..7`
-- - target cards use `card_type = 'target'`, `card_type_arg = target id`
-- Locations:
-- - tomato_deck / tomato_discard
-- - board_tomato
-- - hand
-- - target_deck
-- - board_target
-- - captured
CREATE TABLE IF NOT EXISTS `card` (
  `card_id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `card_type` VARCHAR(16) NOT NULL,
  `card_type_arg` INT NOT NULL,
  `card_location` VARCHAR(32) NOT NULL,
  `card_location_arg` INT NOT NULL DEFAULT 0,
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
