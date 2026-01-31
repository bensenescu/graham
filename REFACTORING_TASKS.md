# Graham Codebase Refactoring Tasks

## Coordination Instructions

This document tracks refactoring tasks for the Graham codebase. Multiple agents may work on these tasks in parallel.

### How to Claim a Task

1. Before starting work on a task, update its status from `[ ]` to `[IN PROGRESS]`
2. Add your agent/session identifier next to the status if possible
3. When complete, update the status to `[x]`
4. If you encounter blockers or need to abandon a task, update status back to `[ ]` and add a note

### Task Dependencies

Some tasks have dependencies noted. Do not start a dependent task until its prerequisites are complete.

### Conflict Resolution

- If two agents claim the same task simultaneously, the first one to push changes wins
- Check git status before starting to ensure no one else is working on the same files
- Prefer working on tasks in different areas of the codebase to minimize merge conflicts

---

## Completed Tasks

- 2026-01-30: HP-1 Extract Page Access Validation Helper
- 2026-01-30: HP-2 Fix Authorization Gap in getBlockReviewsForPage
- 2026-01-30: HP-3 Split PracticeModeModal into Phase Components
- 2026-01-30: HP-4 Split PracticeService into Focused Services
- 2026-01-30: HP-5 Split PracticeRepository into Domain Repositories
- 2026-01-30: MP-1 Remove Unused Todo Type and Rename Cache Key
- 2026-01-30: MP-2 Extract Block Sorting Utility
- 2026-01-30: MP-3 Extract User Color Generation Utility
- 2026-01-30: MP-4 Extract Page Creation Action
- 2026-01-30: MP-5 Refactor usePageCollab to Compose useCollab
- 2026-01-30: MP-6 Create Shared Zod Schemas for Common Inputs
- 2026-01-30: MP-7 Consolidate Accessible Page IDs Logic
- 2026-01-30: MP-8 Add Error Handling for Block Content Sync
- 2026-01-30: MP-9 Add localStorage Error Handling
- 2026-01-30: MP-10 Extract PageCollabContext to Own File
- 2026-01-30: LP-1 Split AIReviewPanel into Smaller Components
- 2026-01-30: LP-2 Standardize Authentication Pattern for API Routes
- 2026-01-30: LP-3 Extract WebSocket Connection Logic
- 2026-01-30: LP-4 Move Hardcoded Defaults to Constants
- 2026-01-30: LP-5 Address ESLint Disable Comments
- 2026-01-30: LP-6 Standardize ID Validation in Zod Schemas
- 2026-01-30: LP-7 Add Timeout Cleanup for PageCollabManager Listeners
- 2026-01-30: LP-8 Document or Remove Hidden Keyboard Shortcuts

---

## Notes

- All tasks should include running `pnpm typecheck` and `pnpm build` before marking complete
- If a refactor changes exports, check for import errors across the codebase
- When splitting files, maintain backwards-compatible exports where possible to minimize breaking changes
