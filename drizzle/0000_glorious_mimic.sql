CREATE TABLE `presence_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`last_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `presence_sessions_last_seen_idx` ON `presence_sessions` (`last_seen`);