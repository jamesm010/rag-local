# Tasks - Single Source of Truth

## Task ID: INIT-001
**Description:** Initialize Next.js project with TypeScript, Tailwind, Shadcn using pnpm
**Complexity:** 4
**Status:** Done
**Assignee:** AI
**Sub-tasks:**
  - [x] Create project structure (`create-next-app`)
  - [x] Initialize Shadcn UI (`shadcn-ui init`)
  - [x] Verify basic setup
**Dependencies:** None
**Estimate:** <1 hour
**Actual:** [Calculate duration, e.g., ~15 mins]
**History:**
  - [Timestamp] Created
  - [Timestamp] Status changed to In Progress
  - [Timestamp] Status changed to Done

### Task: Create Weaviate Upload Route
- **ID:** T003
- **Status:** DONE
- **Complexity:** 3
- **Description:** Implement an API route (`/api/documents/upload`) to accept documents via POST request and upload them to Weaviate using the JS SDK batch import.
- **Assigned:** Assistant
- **ETA:** TBD
- **Verification:** API responds correctly to valid/invalid requests, documents appear in Weaviate.

## Current Tasks

- [x] **Task ID: FE_UI_FIX_001** - Fix UI Component Errors
  - **Status:** DONE
  - **Complexity:** 1
  - **Description:** Fix shadcn UI component imports in the upload page.
  - **Assignee:** AI
  - **Sub-tasks:**
    - [x] Install missing shadcn UI components
    - [x] Replace deprecated toast with sonner
    - [x] Add Toaster to layout
  - **History:**
    - `[timestamp]` - Task created and completed

- [ ] **Task ID: FE_UPLOAD_001** - Create Frontend Upload Page
  - **Status:** IN PROGRESS
  - **Complexity:** 3
  - **Description:** Develop a Next.js page using shadcn/ui at `/app/upload` for users to upload JSON document files to the Weaviate backend API (`/api/documents/upload`).
  - **Assignee:** AI
  - **Dependencies:** Backend API `/api/documents/upload` must be functional.
  - **Progress:**
    - [x] Basic upload form UI implemented
    - [x] Fixed UI component errors
    - [ ] Complete testing with backend integration
  - **History:**
    - `[timestamp]` - Task created
    - `[timestamp]` - Basic UI implementation completed
    - `[timestamp]` - UI component errors fixed 