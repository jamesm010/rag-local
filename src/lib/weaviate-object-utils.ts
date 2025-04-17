import type { Collections, Properties, Filter, FilterValue, NonReferenceInputs, WeaviateObject } from 'weaviate-client';
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
   * Create multiple objects in a collection in a single batch operation.
   * @param collectionName Name of the collection
   * @param objectsData Array of object data to insert
   * @param tenant (Optional) Tenant name/id
   */
  async createObjects<TProperties extends Properties = Properties, TName extends string = string>(
    collectionName: TName,
    objectsData: TProperties[],
    tenant?: string
  ) {
    let collection = this.collections.get<TProperties, TName>(collectionName);
    if (tenant) collection = collection.withTenant(tenant);
    
    // Insert multiple objects by creating a promise for each insert operation
    const insertPromises = objectsData.map(properties => 
      collection.data.insert(properties)
    );
    
    return Promise.all(insertPromises);
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
   * Update multiple objects in a collection in a single batch operation.
   * @param collectionName Name of the collection
   * @param updates Array of objects with id and properties to update
   * @param tenant (Optional) Tenant name/id
   */
  async updateObjects<TProperties extends Properties = Properties, TName extends string = string>(
    collectionName: TName,
    updates: Array<{ id: string; properties: Partial<TProperties> }>,
    tenant?: string
  ) {
    let collection = this.collections.get<TProperties, TName>(collectionName);
    if (tenant) collection = collection.withTenant(tenant);
    
    // Update objects in batch
    const updatePromises = updates.map(update => 
      collection.data.update({ 
        id: update.id, 
        properties: update.properties as unknown as NonReferenceInputs<TProperties> 
      })
    );
    
    return Promise.all(updatePromises);
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
   * Delete multiple objects by their IDs in a single batch operation.
   * @param collectionName Name of the collection 
   * @param ids Array of object IDs to delete
   * @param tenant (Optional) Tenant name/id
   */
  async deleteObjects<TProperties extends Properties = Properties, TName extends string = string>(
    collectionName: TName,
    ids: string[],
    tenant?: string
  ) {
    let collection = this.collections.get<TProperties, TName>(collectionName);
    if (tenant) collection = collection.withTenant(tenant);
    
    // Delete objects in batch
    const deletePromises = ids.map(id => collection.data.deleteById(id));
    return Promise.all(deletePromises);
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
