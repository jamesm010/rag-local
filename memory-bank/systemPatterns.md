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
- Chunked batch processing for handling large numbers of files (20 files per batch).
- RAG (Retrieval Augmented Generation) pattern using Weaviate's nearText method for semantic search.

### RAG (Retrieval Augmented Generation) Pattern

The project implements a standardized approach for retrieving documents from Weaviate based on semantic similarity to input queries:

1. **Retrieval Utility:**
   - Using `WeaviateRetrievalUtils` class for standardized semantic search operations
   - Located in `src/lib/weaviate-retrieval-utils.ts`
   - Implements methods for both standard and group-by semantic searches
   - Provides a convenience wrapper for RAG with common settings

2. **Semantic Search Methods:**
   ```typescript
   // Basic semantic search using nearText
   async nearTextSearch<TProperties>(
     collectionName: string,
     query: string | string[],
     options?: BaseNearTextOptions<TProperties>,
     tenant?: string
   ): Promise<WeaviateReturn<TProperties>>

   // Group-by semantic search
   async nearTextSearchWithGroupBy<TProperties>(
     collectionName: string,
     query: string | string[],
     options: GroupByNearTextOptions<TProperties>,
     tenant?: string
   ): Promise<GroupByReturn<TProperties>>

   // Convenience wrapper with common RAG settings
   async retrieveForRAG<TProperties>(
     collectionName: string,
     query: string,
     limit = 5,
     propertyNames?: string[],
     tenant?: string
   ): Promise<WeaviateReturn<TProperties>>
   ```

3. **Initialization Pattern:**
   ```typescript
   // Correct pattern using static create method
   const retrievalUtils = await WeaviateRetrievalUtils.create();
   
   // This ensures the Weaviate client is properly connected
   ```

4. **Usage Pattern:**
   ```typescript
   // Example usage in an API route
   const results = await retrievalUtils.retrieveForRAG(
     'DocumentCollection',
     'How does authentication work?',
     5
   );
   ```

This pattern should be used whenever implementing RAG functionality to ensure consistency and reliability across the application.

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

### Batch Processing Pattern

The project implements a standardized approach to processing large datasets in manageable chunks:

1. **Batch Size Configuration:**
   ```typescript
   const BATCH_SIZE = 20; // Maximum number of items to process in a single batch
   ```

2. **Batch Processing Logic:**
   - Process items in fixed-size batches
   - Track batch number and total batches for progress reporting
   - Clear batch after processing to free memory
   - Update progress after each batch completion

3. **Error Handling:**
   - Batch-level error handling that only affects the current batch
   - Detailed error tracking for individual items within a batch
   - Proper adjustment of progress counters when a batch fails

4. **Progress Tracking:**
   - Update progress after each batch completion
   - Provide detailed batch-level progress information
   - Maintain accurate counts of processed, succeeded, and failed items

5. **Implementation Example:**
   ```typescript
   let currentBatch: ItemType[] = [];
   let batchNumber = 0;
   let totalBatches = Math.ceil(allItems.length / BATCH_SIZE);
   
   for (let i = 0; i < allItems.length; i++) {
     // Process item and add to current batch
     currentBatch.push(processedItem);
     
     // If batch is full or this is the last item, process the batch
     if (currentBatch.length >= BATCH_SIZE || i === allItems.length - 1) {
       batchNumber++;
       try {
         // Process the batch
         await processBatch(currentBatch);
         // Update progress
       } catch (error) {
         // Handle batch-level error
       }
       // Clear the batch for the next iteration
       currentBatch = [];
       // Update progress
     }
   }
   ```

6. **Benefits:**
   - Prevents memory issues with large datasets
   - Improves reliability by isolating failures to specific batches
   - Provides more granular progress updates
   - Allows for better error recovery

This pattern should be used for any operation that processes large numbers of items, especially when uploading to external services or performing resource-intensive operations.

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
- **`WeaviateRetrievalUtils`**: Located in `src/lib/weaviate-retrieval-utils.ts`. Provides wrapper methods for semantic search operations using the nearText method. Implements common patterns for Retrieval Augmented Generation (RAG). Includes both standard and group-by search capabilities. Like other utilities, follows the static create() method pattern for proper client initialization.

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

### Collection Management API Pattern

The project implements a standardized approach to managing Weaviate collections through RESTful API endpoints:

1. **Collection Name Validation:**
   ```typescript
   // Collection names must:
   // - Be non-empty strings
   // - Start with an uppercase letter
   if (!collectionName || typeof collectionName !== 'string' || collectionName.trim().length === 0) {
     return NextResponse.json({ error: 'Invalid collection name provided' }, { status: 400 });
   }
   if (!/^[A-Z]/.test(collectionName)) {
     return NextResponse.json(
       { error: 'Collection name must start with an uppercase letter.' },
       { status: 400 },
     );
   }
   ```

2. **API Endpoints:**
   - `GET /api/collections` - List all collections
   - `GET /api/collections/[name]` - Get collection information
   - `POST /api/collections/create` - Create a new collection
   - `DELETE /api/collections/delete` - Delete an existing collection
   - All endpoints follow RESTful conventions
   - Consistent error handling and response format

3. **Error Handling:**
   - 400 Bad Request for invalid input
   - 500 Internal Server Error for server/Weaviate issues
   - Detailed error messages in response body
   - Proper error logging for debugging

4. **Response Format:**
   ```typescript
   // Success response
   {
     message?: string;
     collection?: CollectionConfig;  // For GET /api/collections/[name]
     collections?: string[];         // For GET /api/collections
     // Additional data if applicable
   }

   // Error response
   {
     error: string;
     details?: string;
   }
   ```

5. **Implementation Example:**
   ```typescript
   try {
     const collectionUtils = await WeaviateCollectionUtils.create();
     const collection = collectionUtils.getCollection(collectionName);
     const config = await collection.config.get();
     return NextResponse.json({ collection: config });
   } catch (error) {
     console.error('API Error:', error);
     return NextResponse.json(
       { error: 'Failed to fetch collection information', details: errorMessage },
       { status: 500 },
     );
   }
   ```

This pattern should be followed for all collection management operations to ensure consistency and reliability.
