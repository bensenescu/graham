/**
 * Migration Script: Initialize Yjs Durable Objects from D1 Data
 *
 * This script initializes the Yjs Durable Objects with existing page and block data
 * from the D1 database. It should be run once before deploying collaborative editing.
 *
 * The migration is idempotent - running it multiple times will not cause issues
 * because the Durable Objects only initialize from D1 if they don't already have
 * Yjs state stored.
 *
 * Usage:
 *   npx wrangler dev --remote  # Start the worker locally with remote bindings
 *   # In another terminal:
 *   curl -X POST http://localhost:8787/api/migrate-yjs
 *
 * Or run directly against production:
 *   npx wrangler deploy
 *   curl -X POST https://your-worker.workers.dev/api/migrate-yjs
 *
 * What this migration does:
 * 1. Queries all pages from D1
 * 2. For each page, connects to the PageMetaDO to initialize it with:
 *    - Page title
 *    - Block IDs and sort keys
 * 3. For each block, connects to the PageBlockDO to initialize it with:
 *    - Question text
 *    - Answer text
 *
 * The Durable Objects will:
 * 1. Check if they already have Yjs state in storage
 * 2. If not, load data from D1 and initialize the Y.Doc
 * 3. Store the Yjs state for future use
 *
 * Note: This script is designed to be run as a one-time migration.
 * After the initial migration, all changes flow through the Yjs Durable Objects
 * and are periodically synced back to D1.
 */

import { drizzle } from "drizzle-orm/d1";
import { pages, pageBlocks } from "../src/db/schema";
import { eq } from "drizzle-orm";

interface MigrationResult {
  success: boolean;
  pagesProcessed: number;
  blocksProcessed: number;
  errors: string[];
}

/**
 * Run the migration
 *
 * This function is designed to be called from an API route or CLI tool.
 * It requires access to the Cloudflare environment bindings (DB, PAGE_META_DO, PAGE_BLOCK_DO).
 */
export async function runMigration(env: Env): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: true,
    pagesProcessed: 0,
    blocksProcessed: 0,
    errors: [],
  };

  const db = drizzle(env.DB);

  try {
    // Get all pages
    const allPages = await db.select().from(pages);
    console.log(`Found ${allPages.length} pages to migrate`);

    for (const page of allPages) {
      try {
        // Get blocks for this page
        const pageBlocksList = await db
          .select()
          .from(pageBlocks)
          .where(eq(pageBlocks.pageId, page.id))
          .orderBy(pageBlocks.sortKey);

        // Initialize PageMetaDO by making a simple request
        // The DO will load from D1 if it doesn't have Yjs state
        const pageMetaId = env.PAGE_META_DO.idFromName(`page-${page.id}`);
        const pageMetaStub = env.PAGE_META_DO.get(pageMetaId);

        // Make a GET request to trigger initialization
        const pageMetaResponse = await pageMetaStub.fetch(
          `https://internal/page/${page.id}/state`,
          { method: "GET" },
        );

        if (!pageMetaResponse.ok) {
          result.errors.push(
            `Failed to initialize PageMetaDO for page ${page.id}: ${pageMetaResponse.status}`,
          );
          continue;
        }

        result.pagesProcessed++;

        // Initialize each block's DO
        for (const block of pageBlocksList) {
          try {
            const blockDoId = env.PAGE_BLOCK_DO.idFromName(`block-${block.id}`);
            const blockDoStub = env.PAGE_BLOCK_DO.get(blockDoId);

            // Make a GET request to trigger initialization
            const blockResponse = await blockDoStub.fetch(
              `https://internal/block/${block.id}/state`,
              { method: "GET" },
            );

            if (!blockResponse.ok) {
              result.errors.push(
                `Failed to initialize PageBlockDO for block ${block.id}: ${blockResponse.status}`,
              );
              continue;
            }

            result.blocksProcessed++;
          } catch (error) {
            result.errors.push(
              `Error processing block ${block.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
            );
          }
        }

        console.log(
          `Migrated page ${page.id} with ${pageBlocksList.length} blocks`,
        );
      } catch (error) {
        result.errors.push(
          `Error processing page ${page.id}: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    }

    result.success = result.errors.length === 0;
    return result;
  } catch (error) {
    result.success = false;
    result.errors.push(
      `Migration failed: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
    return result;
  }
}

/**
 * Create an API route handler for the migration
 *
 * Add this route to your wrangler.jsonc or routes file:
 *
 * POST /api/migrate-yjs
 */
export function createMigrationHandler() {
  return async (request: Request, env: Env): Promise<Response> => {
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }

    console.log("Starting Yjs migration...");
    const result = await runMigration(env);

    console.log("Migration complete:", result);
    return new Response(JSON.stringify(result, null, 2), {
      status: result.success ? 200 : 500,
      headers: { "Content-Type": "application/json" },
    });
  };
}

// Export for use in API routes
export default {
  runMigration,
  createMigrationHandler,
};
