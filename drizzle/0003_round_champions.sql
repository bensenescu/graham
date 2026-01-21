CREATE TABLE `page_review_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`model` text DEFAULT 'openai-gpt-5.2-high' NOT NULL,
	`default_prompt_id` text,
	`custom_prompt_ids` text DEFAULT '[]' NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`default_prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `page_review_settings_page_id_unique` ON `page_review_settings` (`page_id`);--> statement-breakpoint
CREATE INDEX `page_review_settings_page_id_idx` ON `page_review_settings` (`page_id`);--> statement-breakpoint
CREATE TABLE `prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`prompt` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `prompts_user_id_idx` ON `prompts` (`user_id`);