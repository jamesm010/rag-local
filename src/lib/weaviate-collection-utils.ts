import type { Collections, CollectionConfigCreate, CollectionConfig, Properties, CollectionConfigUpdate, PropertyConfigCreate } from 'weaviate-client';
import weaviateClient from './weaviate';

/**
 * Utility class for managing Weaviate collections using the JS/TS Client v3 standard.
 * Make sure to call weaviateClient.connect() before using this class.
 */
export class WeaviateCollectionUtils {
  private collections: Collections;

  constructor() {
    if (!weaviateClient.collections) {
      throw new Error('Weaviate client not initialized. Call weaviateClient.connect() first.');
    }
    this.collections = weaviateClient.collections;
  }

  /**
   * Create a new collection.
   * @param config Collection creation config (name, properties, etc)
   */
  async createCollection<TProperties extends Properties = Properties, TName extends string = string>(config: CollectionConfigCreate<TProperties, TName>) {
    return this.collections.create<TProperties, TName>(config);
  }

  /**
   * Get a collection instance by name.
   * @param name Collection name
   */
  getCollection<TProperties extends Properties = Properties, TName extends string = string>(name: TName) {
    return this.collections.get<TProperties, TName>(name);
  }

  /**
   * Get a collection instance scoped to a tenant.
   * @param name Collection name
   * @param tenant Tenant name/id
   */
  getCollectionForTenant<TProperties extends Properties = Properties, TName extends string = string>(name: TName, tenant: string) {
    const collection = this.getCollection<TProperties, TName>(name);
    return collection.withTenant(tenant);
  }

  /**
   * List all collection definitions.
   */
  async listAllCollections(): Promise<CollectionConfig[]> {
    try {
      return await this.collections.listAll();
    } catch (error) {
      console.error('Error listing collections:', error);
      throw new Error(
        error instanceof Error 
          ? `Failed to list collections: ${error.message}` 
          : 'Failed to list collections'
      );
    }
  }

  /**
   * Delete a collection by name.
   * @param name Collection name
   */
  async deleteCollection(name: string) {
    return this.collections.delete(name);
  }

  /**
   * Update a collection definition using the collection's config.update().
   * @param name Collection name
   * @param updates Update object for the collection config (must match CollectionConfigUpdate type)
   * @see https://weaviate.github.io/typescript-client/types/CollectionConfigUpdate.html
   */
  async updateCollection<TProperties extends Properties = Properties, TName extends string = string>(name: TName, updates: Partial<CollectionConfigCreate<TProperties, TName>>) {
    // Patch: sanitize stopwords.additions and removals to be string[] (no undefineds)
    if (updates?.invertedIndex?.stopwords) {
      const stopwords = updates.invertedIndex.stopwords; // No 'as any' needed
      if (Array.isArray(stopwords.additions)) {
        stopwords.additions = stopwords.additions.filter((x): x is string => typeof x === 'string');
      }
      if (Array.isArray(stopwords.removals)) {
        stopwords.removals = stopwords.removals.filter((x): x is string => typeof x === 'string');
      }
    }
    const collection = this.getCollection<TProperties, TName>(name);
    // Optionally, validate updates shape here if needed
    // Cast to CollectionConfigUpdate after sanitization
    return collection.config.update(updates as CollectionConfigUpdate);
  }

  /**
   * Add a property to a collection using the collection's config.addProperty().
   * @param name Collection name
   * @param property Property definition object. Must include at least:
   *   - name: string
   *   - dataType: string | string[]
   *   See: https://weaviate.github.io/typescript-client/interfaces/Config.html#addProperty
   *
   * Example:
   *   { name: 'onHomepage', dataType: 'boolean' }
   *   { name: 'tags', dataType: ['text'] }
   *
   * Throws if property is missing required fields.
   */
  async addProperty<TProperties extends Properties = Properties, TName extends string = string>(name: TName, property: PropertyConfigCreate<TProperties>) {
    if (!property || typeof property !== 'object') {
      throw new Error('Property must be an object. See Weaviate JS/TS v3 docs for structure.');
    }
    if (typeof property.name !== 'string' || !property.name) {
      throw new Error('Property must have a non-empty string "name" field.');
    }
    const collection = this.getCollection<TProperties, TName>(name);
    return collection.config.addProperty(property);
  }

  /**
   * Static method to create an initialized instance after ensuring client connection
   */
  static async create(): Promise<WeaviateCollectionUtils> {
    await weaviateClient.connect();
    return new WeaviateCollectionUtils();
  }
}

export default WeaviateCollectionUtils;
