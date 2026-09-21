CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`participant_id` text NOT NULL,
	`itinerary_id` text NOT NULL,
	`body` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `participants` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`photo` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE `votes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`participant_id` text NOT NULL,
	`itinerary_id` text NOT NULL,
	`choice` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `vote_once` ON `votes` (`participant_id`,`itinerary_id`);