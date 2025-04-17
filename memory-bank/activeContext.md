# Active Context

**Current Focus:** Weaviate Document Upload (WEAVIATE-UPLOAD-001)

**Status:** Completed

**Implementation Details:**
- Created API route `/api/docs/upload` that processes files from `public/docs` and uploads them to Weaviate
- Implemented comprehensive progress tracking via a JSON file stored in `.temp/upload-progress.json`
- Added collection name parameter support via URL query parameter
- Designed fault-tolerant file processing with detailed error tracking
- Added JSDoc comments throughout the file for improved maintainability
- Enhanced file processing to handle large numbers of files by implementing batch processing (20 files per batch)

**Key Features:**
1. **Progress Tracking:**
   - Tracks total files, processed files, uploaded files, and failed files
   - Stores start and end timestamps for performance monitoring
   - Persists collection name for tracking uploads to different collections
   - Properly handles concurrent upload attempts with 409 Conflict response

2. **Collection Management:**
   - Dynamically creates Weaviate collection if it doesn't exist
   - Configurable collection name via query parameter (defaults to 'UploadedDocs')
   - Sets up appropriate schema properties for document storage

3. **File Processing:**
   - Recursively scans document directory for supported file types (.txt, .md, .json)
   - Creates directories if they don't exist
   - Handles file reading errors gracefully with detailed reporting
   - Extracts metadata including filename, path, content, and modification time
   - Processes files in batches of 20 to handle large numbers of files efficiently
   - Provides detailed batch-level progress information and error handling

4. **Error Handling:**
   - Detailed error tracking for individual files
   - Proper status codes for various error conditions
   - Consistent error message format for client consumption
   - Batch-level error handling that only affects the current batch, not the entire upload

**API Endpoints:**
- `POST /api/docs/upload?collection=CollectionName` - Process and upload documents
- `GET /api/docs/upload?collection=CollectionName` - Check upload progress

**Affected Files:**
- `src/app/api/docs/upload/route.ts` (Created and Enhanced)

**Next Steps:**
- Integrate with frontend UI for file upload and progress monitoring
- Add support for more file types
- Implement document deletion and update functionality

**Recent Changes:**
- Enhanced document upload process in `src/app/api/docs/upload/route.ts` to handle large numbers of files:
  - Added `BATCH_SIZE` constant (20 files per batch)
  - Implemented batch processing logic to upload files in smaller chunks
  - Added batch-level progress tracking and error handling
  - Improved logging with batch number and total batch count
  - Enhanced error recovery to only affect the current batch, not the entire upload
- Enhanced `src/components/ui/combobox.tsx` component to allow adding custom actions at the end:
  - Added new `actions` prop of type `React.ReactNode` to the `ComboboxProps` interface
  - Added a conditional render for the actions in a bordered container at the bottom of the dropdown
  - Added proper TypeScript support with destructuring in component props
- Created `src/app/example-combobox/page.tsx` as a demonstration page showing:
  - Basic combobox without actions (standard implementation)
  - Enhanced combobox with an "Add new fruit..." action button
  - Live state management for adding new items to the combobox options
- Fixed Weaviate collection API route in `src/app/api/collections/create/route.ts`:
  - Replaced direct instantiation of `WeaviateCollectionUtils` with the static `create()` method
  - Removed redundant client connection code
  - Added proper error handling for connection failures
  - This fixed the bug where CRUD methods were failing with "Weaviate client not initialized. Call connect() first" error
- Added batch methods to `WeaviateObjectUtils` class in `src/lib/weaviate-object-utils.ts`:
  - `createObjects`: Batch creation of multiple objects using parallel Promise.all
  - `updateObjects`: Batch updating of multiple objects with their respective properties
  - `deleteObjects`: Batch deletion of objects by IDs
- All batch methods maintain support for multi-tenancy (optional tenant parameter)
- Installed shadcn UI components (button, card, input, label) using pnpm
- Replaced deprecated toast component with sonner for notifications
- Added Toaster component to layout.tsx
- Updated src/app/upload/page.tsx to use sonner instead of useToast
- Installed necessary dependencies (tailwindcss-animate, sonner)
- Added `weaviate-ts-client` dependency.
- Created Weaviate client initialization in `src/lib/weaviate.ts` (requires `.env.local` setup).
- Created API route `src/app/api/documents/upload/route.ts` for POST requests.
- Implemented batch document upload logic using `client.batch.objectsBatcher()`.
- Added basic request validation and error handling.
- Updated Task T003 status to IN PROGRESS.
- Created `.cursorrules`.
- Created `memory-bank/` directory and initial files (`tasks.md`, `projectbrief.md`, `productContext.md`).
- Updated `tasks.md` to specify using `pnpm`.
- Successfully created Next.js project in root using temporary directory strategy.
- Initialized Shadcn UI.
- Verified basic setup by running dev server.
- Completed Task INIT-001.
- Confirmed installation/presence of Shadcn UI components: Dialog, Command, Popover, lucide-react.

### 2024-08-18 Work Log:
- Added batch operation methods to `src/lib/weaviate-object-utils.ts`:
  - Implemented parallelized batch operations using Promise.all pattern
  - Fixed TypeScript type issues related to BatchObject interface
  - Maintained multi-tenancy support across all methods
- Attempted to fix linter errors in `src/lib/weaviate-collection-utils.ts` (Task ID: FIX-LINT-WEAVIATE-UTILS).
- Resolved issues with `any` types and optional chaining in `createCollection`, `getCollection`, and `updateCollection` methods.
- Encountered persistent TypeScript type errors related to the `property` argument in the `addProperty` method.
    - Tried `PropertyConfigCreate`, `PropertyConfigCreate<Properties>`, and a custom inline type.
    - The core issue seems to be reconciling the utility function's input validation with the specific type (`PropertyConfigCreate`) expected by the underlying `collection.config.addProperty` method from the `weaviate-client` library.
- The user manually updated the `addProperty` signature to use `PropertyConfigCreate<TProperties>`.
- Currently blocked on resolving the type error for `addProperty`.

## Current Task: Create API endpoint for reading files from public/docs directory

**Status:** Completed Implementation

**Details:**
- Created new API endpoint at `/api/docs` to recursively scan the public/docs directory
- Implemented comprehensive file metadata retrieval with TypeScript interfaces:
  - File name, path, size, modification date, type (extension)
  - Directory detection with recursive scanning for nested files
  - Organization of files by type
- Implemented directory auto-creation if the public/docs directory doesn't exist
- Used Node.js fs module with promisified functions for better async handling
- Employed Promise.all pattern for parallel file processing
- Added comprehensive error handling and proper status codes
- Added test files to verify functionality

**Affected Files:**
- `src/app/api/docs/route.ts` (Created)
- `public/docs/` (Created with test files)

**Response Structure:**
- `fileTree`: Complete hierarchical structure showing directories and files
- `files`: Flat list of all files (excluding directories)
- `filesByType`: Files grouped by their extension type
- `count`: Total number of files found
- `message`: Status message

**Notes:**
- The API properly handles nested subdirectories and provides both hierarchical and flat views of files
- Used "node:" protocol prefixes for Node.js built-in modules to comply with project linting rules
- Used for...of loop instead of forEach for better readability and to follow project linting guidelines

## Current Focus: Weaviate Document Upload (WEAVIATE-UPLOAD-001)

Implementing the API route `/api/docs/upload` to process files from `public/docs` and upload them to Weaviate. This involves:
- Reading local files.
- Connecting to Weaviate.
- Batch uploading document content.
- Tracking progress via a JSON status file.
