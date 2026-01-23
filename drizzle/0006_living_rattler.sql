CREATE TABLE `page_overall_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`prompt_id` text,
	`custom_prompt` text,
	`summary` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `page_overall_reviews_page_id_unique` ON `page_overall_reviews` (`page_id`);--> statement-breakpoint
CREATE INDEX `page_overall_reviews_page_id_idx` ON `page_overall_reviews` (`page_id`);