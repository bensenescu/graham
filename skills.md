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

## TanStack Router - Remount on Parameter Change

By default, TanStack Router does **not** remount route components when only the route parameters change. This means component state (useState, etc.) persists when navigating between pages with different IDs.

To force a remount when parameters change, use the `remountDeps` option:

```typescript
export const Route = createFileRoute("/page/$pageId")({
  component: PageEditor,
  // Remount component when pageId changes to reset all state
  remountDeps: ({ params }) => params.pageId,
});
```

This is useful when:

- Component has local state that should reset per item (e.g., edit mode, form inputs)
- useMemo/useCallback depend on route params and need fresh instances
- You want predictable "fresh page" behavior on navigation

The `remountDeps` function receives `{ params, search, loaderDeps, routeId }` and should return a JSON-serializable value. The component remounts when this value changes.
