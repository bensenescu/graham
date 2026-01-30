CREATE TABLE `practice_answer_ratings` (
	`id` text PRIMARY KEY NOT NULL,
	`answer_id` text NOT NULL,
	`criterion_id` text NOT NULL,
	`rating` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`answer_id`) REFERENCES `practice_answers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`criterion_id`) REFERENCES `practice_criteria`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `practice_answer_ratings_answer_id_idx` ON `practice_answer_ratings` (`answer_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `practice_answer_ratings_answer_criterion_idx` ON `practice_answer_ratings` (`answer_id`,`criterion_id`);--> statement-breakpoint
CREATE TABLE `practice_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`block_id` text NOT NULL,
	`duration_seconds` text NOT NULL,
	`transcription` text,
	`transcription_status` text DEFAULT 'pending' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `practice_sessions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`block_id`) REFERENCES `page_blocks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `practice_answers_session_id_idx` ON `practice_answers` (`session_id`);--> statement-breakpoint
CREATE INDEX `practice_answers_block_id_idx` ON `practice_answers` (`block_id`);--> statement-breakpoint
CREATE TABLE `practice_criteria` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `practice_criteria_user_id_idx` ON `practice_criteria` (`user_id`);--> statement-breakpoint
CREATE TABLE `practice_pool_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`block_id` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`block_id`) REFERENCES `page_blocks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `practice_pool_blocks_page_id_idx` ON `practice_pool_blocks` (`page_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `practice_pool_blocks_page_block_idx` ON `practice_pool_blocks` (`page_id`,`block_id`);--> statement-breakpoint
CREATE TABLE `practice_pool_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`mode` text DEFAULT 'all' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `practice_pool_settings_page_id_unique` ON `practice_pool_settings` (`page_id`);--> statement-breakpoint
CREATE INDEX `practice_pool_settings_page_id_idx` ON `practice_pool_settings` (`page_id`);--> statement-breakpoint
CREATE TABLE `practice_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`started_at` text DEFAULT (current_timestamp) NOT NULL,
	`completed_at` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `practice_sessions_page_id_idx` ON `practice_sessions` (`page_id`);
