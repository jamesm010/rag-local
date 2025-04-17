# System Patterns

**Architecture:** Standard Next.js App Router structure.

**Key Decisions:**
- Using Next.js for full-stack React capabilities.
- Employing Tailwind CSS for utility-first styling.
- Utilizing shadcn/ui for pre-built, customizable components.
- Using TypeScript for static typing.
- Using pnpm for package management.

**Data Handling:**
- Weaviate client initialized in `src/lib/weaviate.ts` using environment variables (`WEAVIATE_URL`, `WEAVIATE_API_KEY`).
- API route pattern: Next.js App Router (`src/app/api/.../route.ts`).
- Batch processing pattern used for Weaviate uploads (`client.batch.objectsBatcher`).
- Parallelized batch operations using Promise.all pattern for improved performance.
- File system operations using Node.js fs module with promisified functions for async handling.
- Recursive directory scanning pattern for traversing nested directory structures.

### File System Operations
- **Directory Scanning**: Recursively scan directories using a tree-based approach that preserves the hierarchical structure.
- **File Metadata**: Extract comprehensive file metadata including name, path, size, type, and modification date.
- **Type Organization**: Group files by their extension types for better organization and filtering.
- **Error Handling**: Proper error handling with informative messages and appropriate status codes in API responses.
- **Auto-creation**: Automatically create directories if they don't exist to ensure smooth operation.
- **Node.js Patterns**:
  - Use the `node:` protocol prefix for Node.js built-in modules (`node:fs`, `node:path`, `node:util`) for clarity and to follow project linting rules.
  - Prefer promisified functions (`promisify`) over callback-based Node.js APIs for better async handling.
  - Use `for...of` loops instead of `forEach` when processing arrays for better readability and to follow project linting guidelines.

### Utility Classes
- **`WeaviateCollectionUtils`**: Located in `src/lib/weaviate-collection-utils.ts`. Provides a wrapper around the `weaviate-client` library's `collections` API for common operations like creating, getting, updating, and deleting collections, as well as adding properties. Simplifies interactions with Weaviate collections.
  - **Important Pattern**: Always use the static `WeaviateCollectionUtils.create()` method rather than direct instantiation (`new WeaviateCollectionUtils()`) to ensure the Weaviate client is properly connected before use. This static method handles the connection asynchronously and returns a properly initialized instance.
  - Example usage:
    ```typescript
    // Correct pattern:
    const collectionUtils = await WeaviateCollectionUtils.create();
    
    // Incorrect pattern (will throw "Weaviate client not initialized" error):
    const collectionUtils = new WeaviateCollectionUtils();
    ```
- **`WeaviateObjectUtils`**: Located in `src/lib/weaviate-object-utils.ts`. Provides wrapper methods for CRUD operations on Weaviate objects, including both single operations and batch operations. Supports multi-tenancy through optional tenant parameters. Uses Promise.all pattern for efficient parallel batch processing.

## Progress Tracking Pattern

The project implements a standardized approach to tracking progress for long-running operations:

1. **Progress State Interface:**
   ```typescript
   interface ProgressState {
     status: 'pending' | 'in-progress' | 'completed' | 'failed';
     totalItems: number;
     itemsProcessed: number;
     itemsSucceeded: number;
     failedItems: { id: string; error: string }[];
     startTime: string | null;
     endTime: string | null;
     error: string | null;
   }
   ```

2. **Persistence to Filesystem:**
   - Progress state is persisted to disk in a JSON file
   - Files are stored in the `.temp` directory
   - Directory is created if it doesn't exist
   - Standardized read/write helper functions

3. **Concurrency Control:**
   - Check for existing in-progress operations
   - Return 409 Conflict if concurrent operation attempted
   - Properly handle reset/initialization of state

4. **Status Reporting:**
   - Dedicated GET endpoint to check progress
   - Consistent error reporting format
   - Clear success/failure indicators
   - Performance metrics (timing, counts)

5. **Implementation Example:**
   - See `src/app/api/docs/upload/route.ts` for reference implementation

This pattern should be followed for all long-running API operations that require progress tracking or status monitoring.
