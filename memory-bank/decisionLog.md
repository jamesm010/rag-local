# Decision Log

[2025-04-16 18:24:09] - Adopted Biome for code formatting, linting, and import organization. Chose @biomejs/biome as devDependency and created biome.json with recommended TypeScript settings. Used pnpm as package manager.
[2025-04-16 18:24:09] - User customized biome.json to remove quoteStyle and trailingComma from formatter section.

### 2024-08-18: Linter Fix Blocker (`weaviate-collection-utils.ts`)
- **Problem:** Persistent TypeScript type error on the `property` argument of the `addProperty` method in `WeaviateCollectionUtils`.
- **Attempts:**
    - Used `PropertyConfigCreate` (required generic argument).
    - Used `PropertyConfigCreate<Properties>` (led to downstream `never` type error).
    - Used inline type `{ name: string; dataType: string | string[]; [key: string]: unknown }` (dataType mismatch).
    - Reverted to `PropertyConfigCreate` and removed internal `dataType` check (generic argument required).
    - User manually set type to `PropertyConfigCreate<TProperties>`.
- **Decision:** Paused fixing and asked the user for direction due to conflicting type requirements between the utility function's needs and the underlying Weaviate client library method signature.
