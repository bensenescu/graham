CREATE TABLE `page_blocks` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`question` text NOT NULL,
	`answer` text DEFAULT '' NOT NULL,
	`sort_key` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	`updated_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `page_blocks_page_id_idx` ON `page_blocks` (`page_id`);--> statement-breakpoint
ALTER TABLE `pages` DROP COLUMN `content`;