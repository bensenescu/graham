# Skills & Patterns

## Cloudflare D1 Batch Inserts

Cloudflare D1 does **not** support multi-row inserts using Drizzle's `.values([...])` array syntax. This will fail:

```typescript
// WRONG - will fail on Cloudflare D1
await db.insert(pageBlocks).values([
  { id: "1", pageId: "abc", ... },
  { id: "2", pageId: "abc", ... },
]);
```

Instead, use `db.batch()` with an array of individual insert statements:

```typescript
// CORRECT - works on Cloudflare D1
const insertStatements = blocks.map((block) =>
  db.insert(pageBlocks).values({
    id: block.id,
    pageId: block.pageId,
    question: block.question,
    answer: block.answer ?? "",
    sortKey: block.sortKey,
    createdAt: now,
    updatedAt: now,
  }),
);

const [first, ...rest] = insertStatements;
await db.batch([first, ...rest]);
```

The `db.batch()` method executes all statements in a single transaction, which is both efficient and atomic.

Reference: See `workout-tracker` example app for batch operation patterns (e.g., `WorkoutExerciseRepository.createBatch`).
