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

## API Routes with TanStack Start

When creating API routes in TanStack Start, use `createFileRoute` with the `server.handlers` pattern. Do **not** use `createOptimisticAction` from `@tanstack/react-db` for API calls - it doesn't work correctly with TanStack Start's server function handling.

### Creating an API Route

```typescript
// src/routes/api/my-endpoint.ts
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/my-endpoint")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Parse request body
        const data = await request.json();

        // Do your work...
        const result = {
          /* ... */
        };

        return new Response(JSON.stringify(result), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
```

### Calling the API from Client

Use `useMutation` from `@tanstack/react-query` combined with `authenticatedFetch` from `@every-app/sdk/core`:

```typescript
import { useMutation } from "@tanstack/react-query";
import { authenticatedFetch } from "@every-app/sdk/core";

// Define mutation variables type
interface MyMutationVariables {
  data: string;
}

// In your component/hook
const mutation = useMutation({
  mutationFn: async ({ data }: MyMutationVariables) => {
    const response = await authenticatedFetch("/api/my-endpoint", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed: ${response.status}`);
    }

    return response.json();
  },
  onMutate: async (variables) => {
    // Optimistic updates (optional)
  },
  onSuccess: (data, variables) => {
    // Handle success
  },
  onError: (error, variables) => {
    // Handle error
  },
});

// Call the mutation
await mutation.mutateAsync({ data: "example" });
```

Reference: See `src/client/hooks/useAIReview.ts` for a complete example of this pattern.
