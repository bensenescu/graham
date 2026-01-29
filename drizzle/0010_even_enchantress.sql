CREATE TABLE `page_shares` (
	`id` text PRIMARY KEY NOT NULL,
	`page_id` text NOT NULL,
	`user_id` text NOT NULL,
	`shared_by` text NOT NULL,
	`created_at` text DEFAULT (current_timestamp) NOT NULL,
	FOREIGN KEY (`page_id`) REFERENCES `pages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`shared_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `page_shares_page_id_idx` ON `page_shares` (`page_id`);--> statement-breakpoint
CREATE INDEX `page_shares_user_id_idx` ON `page_shares` (`user_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `page_shares_page_user_idx` ON `page_shares` (`page_id`,`user_id`);