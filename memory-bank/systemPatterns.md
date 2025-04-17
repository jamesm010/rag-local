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

### Utility Classes
- **`WeaviateCollectionUtils`**: Located in `src/lib/weaviate-collection-utils.ts`. Provides a wrapper around the `weaviate-client` library's `collections` API for common operations like creating, getting, updating, and deleting collections, as well as adding properties. Simplifies interactions with Weaviate collections.
- **`WeaviateObjectUtils`**: Located in `src/lib/weaviate-object-utils.ts`. Provides wrapper methods for CRUD operations on Weaviate objects, including both single operations and batch operations. Supports multi-tenancy through optional tenant parameters. Uses Promise.all pattern for efficient parallel batch processing. 