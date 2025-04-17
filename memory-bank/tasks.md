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

- [x] **Task ID: WEAVIATE_BATCH_OPS** - Add Batch Operations to WeaviateObjectUtils
  - **Status:** DONE
  - **Complexity:** 2
  - **Description:** Implement batch operations (create, update, delete) in the WeaviateObjectUtils class to improve performance when dealing with multiple objects.
  - **Assignee:** AI
  - **Sub-tasks:**
    - [x] Add createObjects method for batch creation
    - [x] Add updateObjects method for batch updates
    - [x] Add deleteObjects method for batch deletions
    - [x] Ensure multi-tenancy support in all methods
    - [x] Fix TypeScript type issues
  - **History:**
    - `[2024-08-18]` - Task created
    - `[2024-08-18]` - Implementation completed with Promise.all pattern

- [x] **Task ID: WEAVIATE-UPLOAD-BATCH** - Enhance Document Upload with Batch Processing
  - **Status:** DONE
  - **Complexity:** 2
  - **Description:** Modify the document upload API route to process files in batches of 20 to handle large numbers of files efficiently.
  - **Assignee:** AI
  - **Sub-tasks:**
    - [x] Add BATCH_SIZE constant (20 files per batch)
    - [x] Implement batch processing logic
    - [x] Add batch-level progress tracking
    - [x] Enhance error handling for batch-level failures
    - [x] Improve logging with batch information
  - **History:**
    - `[2024-08-19]` - Task created and completed
    - `[2024-08-19]` - Implementation completed with batch processing

### 2024-08-18

- [ ] **Fix Linter Errors in `weaviate-collection-utils.ts`** (ID: FIX-LINT-WEAVIATE-UTILS) - Level 1
    - Status: IN_PROGRESS
    - Goal: Resolve TypeScript type errors reported by the linter.
    - Scope: `src/lib/weaviate-collection-utils.ts`
    - Context: Address `any` types, optional chaining, and argument type mismatches based on Weaviate client v3 documentation. **Currently blocked by a persistent type error on the `property` argument of the `addProperty` method.** 

---
id: T004
title: Implement Collection Combobox on Upload Page
status: Verification Pending
complexity: 3
description: >
  Replace the class name text input on the /upload page with a Shadcn Combobox.
  List existing collections fetched via API. Include an option to create a new
  collection using a Shadcn Dialog. Requires new API endpoints.
dependencies: []
assigned_to: AI
created_at: 2024-07-26T11:45:00Z # Placeholder
updated_at: 2024-08-19T10:30:00Z # Placeholder
--- 

- [x] **WEAVIATE-UPLOAD-001:** Create API route `/api/docs/upload` to read files from `public/docs`, upload to Weaviate, and track progress in a JSON file. 
  - **Status:** DONE
  - **Complexity:** 3
  - **Description:** Implement an API route that:
    - Reads files from the public/docs directory
    - Uploads content to Weaviate with appropriate metadata
    - Tracks progress via a JSON file for status monitoring
    - Supports specifying collection name via query parameter
  - **Features Implemented:**
    - Progress tracking with detailed file statistics
    - Fault-tolerant processing with error tracking
    - Dynamic collection creation
    - Support for multiple file types (.txt, .md, .json)
    - JSDoc comments for maintainability
    - Batch processing (20 files per batch) for handling large numbers of files
  - **API Endpoints:**
    - POST /api/docs/upload?collection=Name - Upload documents
    - GET /api/docs/upload?collection=Name - Check progress
  - **Created Files:**
    - src/app/api/docs/upload/route.ts 