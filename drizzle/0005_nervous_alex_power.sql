CREATE TABLE `page_overall_review_selected_prompts` (
	`id` text PRIMARY KEY NOT NULL,
	`page_overall_review_settings_id` text NOT NULL,
	`prompt_id` text NOT NULL,
	FOREIGN KEY (`page_overall_review_settings_id`) REFERENCES `page_overall_review_settings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `pors_settings_id_idx` ON `page_overall_review_selected_prompts` (`page_overall_review_settings_id`);--> statement-breakpoint
CREATE INDEX `pors_prompt_id_idx` ON `page_overall_review_selected_prompts` (`prompt_id`);--> statement-breakpoint
CREATE TABLE `page_overall_review_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`mode` text DEFAULT 'all_prompts' NOT NULL,
	`custom_prompt` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `page_overall_review_settings_page_id_unique` ON `page_overall_review_settings` (`page_id`);--> statement-breakpoint
CREATE INDEX `page_overall_review_settings_page_id_idx` ON `page_overall_review_settings` (`page_id`);