import type {
  BaseNearTextOptions,
  GroupByNearTextOptions,
  GroupByReturn,
  Properties,
  WeaviateReturn,
} from 'weaviate-client';
import weaviateClient from './weaviate';

/**
 * Utility class for performing RAG (Retrieval Augmented Generation) operations
 * using Weaviate's semantic search capabilities.
 *
 * This class provides methods for retrieving documents similar to a given text query
 * using the nearText method and other semantic search approaches.
 */
export class WeaviateRetrievalUtils {
  constructor() {
    if (!weaviateClient.collections) {
      throw new Error('Weaviate client not initialized. Call weaviateClient.connect() first.');
    }
  }

  /**
   * Perform a semantic search using the nearText method to find documents
   * similar to the provided query.
   *
   * @param collectionName Name of the collection to search
   * @param query The text query to search for (string or array of strings)
   * @param options Additional search options such as limit, distance, etc.
   * @param tenant Optional tenant name for multi-tenant collections
   * @returns Promise with the search results
   */
  async nearTextSearch<TProperties extends Properties = Properties, TName extends string = string>(
    collectionName: TName,
    query: string | string[],
    options?: BaseNearTextOptions<TProperties>,
    tenant?: string,
  ): Promise<WeaviateReturn<TProperties>> {
    let collection = weaviateClient.collections.get<TProperties, TName>(collectionName);
    if (tenant) collection = collection.withTenant(tenant);

    return collection.query.nearText(query, options);
  }

  /**
   * Perform a semantic search with group by functionality using the nearText method.
   *
   * @param collectionName Name of the collection to search
   * @param query The text query to search for
   * @param options Group by options for the search
   * @param tenant Optional tenant name for multi-tenant collections
   * @returns Promise with grouped search results
   */
  async nearTextSearchWithGroupBy<
    TProperties extends Properties = Properties,
    TName extends string = string,
  >(
    collectionName: TName,
    query: string | string[],
    options: GroupByNearTextOptions<TProperties>,
    tenant?: string,
  ): Promise<GroupByReturn<TProperties>> {
    let collection = weaviateClient.collections.get<TProperties, TName>(collectionName);
    if (tenant) collection = collection.withTenant(tenant);

    return collection.query.nearText(query, options) as Promise<GroupByReturn<TProperties>>;
  }

  /**
   * Retrieve documents for RAG (Retrieval Augmented Generation) using semantic search.
   * This is a convenience wrapper around nearTextSearch with common RAG settings.
   *
   * @param collectionName Name of the collection to search
   * @param query The text query/question to search for
   * @param limit Maximum number of results to return (default: 5)
   * @param propertyNames Optional specific properties to include in results
   * @param tenant Optional tenant name for multi-tenant collections
   * @returns Promise with the search results
   */
  async retrieveForRAG<TProperties extends Properties = Properties, TName extends string = string>(
    collectionName: TName,
    query: string,
    limit = 5,
    propertyNames?: string[],
    tenant?: string,
  ): Promise<WeaviateReturn<TProperties>> {
    // Create base options
    const options: BaseNearTextOptions<TProperties> = {
      limit,
    };

    // Simply pass the options to the nearTextSearch method
    // In the v3 of the Weaviate client, you don't need to specify
    // which properties to return - by default all are returned
    // The BaseNearTextOptions doesn't have a properties field
    return this.nearTextSearch<TProperties, TName>(collectionName, query, options, tenant);
  }

  /**
   * Static method to create an initialized instance after ensuring client connection
   */
  static async create(): Promise<WeaviateRetrievalUtils> {
    await weaviateClient.connect();
    return new WeaviateRetrievalUtils();
  }
}

export default WeaviateRetrievalUtils;
