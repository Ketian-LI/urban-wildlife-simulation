CREATE TABLE `simulation_saves` (
	`owner_id` text PRIMARY KEY NOT NULL,
	`state_json` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `simulation_saves_updated_at_idx` ON `simulation_saves` (`updated_at`);