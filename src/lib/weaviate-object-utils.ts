import type { Collections, Properties, Filter, FilterValue, NonReferenceInputs } from 'weaviate-client';
import weaviateClient from './weaviate';

/**
 * Utility class for managing Weaviate objects (CRUD) using the JS/TS Client v3 standard.
 * Supports multi-tenancy (pass tenant to relevant methods).
 * Make sure to call weaviateClient.connect() before using this class.
 */
export class WeaviateObjectUtils {
  private collections: Collections;

  constructor() {
    if (!weaviateClient.collections) {
      throw new Error('Weaviate client not initialized. Call weaviateClient.connect() first.');
    }
    this.collections = weaviateClient.collections;
  }

  /**
   * Create a new object in a collection.
   * @param collectionName Name of the collection
   * @param objectData The object data (properties)
   * @param tenant (Optional) Tenant name/id
   */
  async createObject<TProperties extends Properties = Properties, TName extends string = string>(
    collectionName: TName,
    objectData: TProperties,
    tenant?: string
  ) {
    let collection = this.collections.get<TProperties, TName>(collectionName);
    if (tenant) collection = collection.withTenant(tenant);
    return collection.data.insert(objectData);
  }

  /**
   * Get an object by ID.
   * @param collectionName Name of the collection
   * @param id The object ID
   * @param tenant (Optional) Tenant name/id
   */
  async getObjectById<TProperties extends Properties = Properties, TName extends string = string>(
    collectionName: TName,
    id: string,
    tenant?: string
  ) {
    let collection = this.collections.get<TProperties, TName>(collectionName);
    if (tenant) collection = collection.withTenant(tenant);
    return collection.query.fetchObjectById(id);
  }

  /**
   * Update an object by ID.
   * @param collectionName Name of the collection
   * @param id The object ID
   * @param updates Partial object properties to update
   * @param tenant (Optional) Tenant name/id
   */
  async updateObject<TProperties extends Properties = Properties, TName extends string = string>(
    collectionName: TName,
    id: string,
    updates: Partial<TProperties>,
    tenant?: string
  ) {
    let collection = this.collections.get<TProperties, TName>(collectionName);
    if (tenant) collection = collection.withTenant(tenant);
    // Cast to NonReferenceInputs<TProperties> via unknown
    return collection.data.update({ id, properties: updates as unknown as NonReferenceInputs<TProperties> });
  }

  /**
   * Delete an object by ID.
   * @param collectionName Name of the collection
   * @param id The object ID
   * @param tenant (Optional) Tenant name/id
   */
  async deleteObject<TProperties extends Properties = Properties, TName extends string = string>(
    collectionName: TName,
    id: string,
    tenant?: string
  ) {
    let collection = this.collections.get<TProperties, TName>(collectionName);
    if (tenant) collection = collection.withTenant(tenant);
    return collection.data.deleteById(id);
  }

  /**
   * List objects in a collection (optionally filtered, paginated, with tenant).
   * @param collectionName Name of the collection
   * @param where (Optional) Filter object (compatible with fetchObjects 'where' or 'filters')
   * @param tenant (Optional) Tenant name/id
   * @param limit (Optional) Limit number of results
   * @param offset (Optional) Offset for pagination
   */
  async listObjects<TProperties extends Properties = Properties, TName extends string = string>(
    collectionName: TName,
    where?: FilterValue,
    tenant?: string,
    limit?: number,
    offset?: number
  ) {
    let collection = this.collections.get<TProperties, TName>(collectionName);
    if (tenant) collection = collection.withTenant(tenant);

    // Use fetchObjects with options for filtering, limit, and offset
    return collection.query.fetchObjects({
      limit: limit,
      offset: offset,
      filters: where,
    });
  }
}

export default WeaviateObjectUtils;
