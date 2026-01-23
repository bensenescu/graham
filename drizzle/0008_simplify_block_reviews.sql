-- Simplify block_reviews: replace strengths/improvements/tips with single suggestion field
ALTER TABLE `block_reviews` ADD COLUMN `suggestion` text;--> statement-breakpoint
ALTER TABLE `block_reviews` DROP COLUMN `strengths`;--> statement-breakpoint
ALTER TABLE `block_reviews` DROP COLUMN `improvements`;--> statement-breakpoint
ALTER TABLE `block_reviews` DROP COLUMN `tips`;
