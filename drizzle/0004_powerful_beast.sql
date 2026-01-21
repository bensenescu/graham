CREATE TABLE `block_reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`block_id` text NOT NULL,
	`prompt_id` text NOT NULL,
	`strengths` text NOT NULL,
	`improvements` text NOT NULL,
	`tips` text,
	`answer_snapshot` text,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`block_id`) REFERENCES `page_blocks`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `block_reviews_block_id_idx` ON `block_reviews` (`block_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `block_reviews_block_prompt_idx` ON `block_reviews` (`block_id`,`prompt_id`);