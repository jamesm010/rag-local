import weaviate, { type WeaviateClient } from 'weaviate-client';

// Initialize the client lazily
let client: WeaviateClient | null = null;
let clientPromise: Promise<WeaviateClient> | null = null;
let isConnecting = false;

async function initClient() {
  const weaviateHost = process.env.WEAVIATE_HOST;
  
  if (weaviateHost === 'cloud') {
    const weaviateUrl = process.env.WEAVIATE_CLOUD_URL;
    const weaviateApiKey = process.env.WEAVIATE_CLOUD_API_KEY;

    if (!weaviateUrl) {
      throw new Error('WEAVIATE_URL environment variable not set');
    }
    if (!weaviateApiKey) {
      throw new Error('WEAVIATE_API_KEY environment variable not set');
    }
    
    return weaviate.connectToWeaviateCloud(
      weaviateUrl,
      {
        authCredentials: {
          apiKey: weaviateApiKey
        }
      }
    );
  }

  return weaviate.connectToLocal();
}

export default {
  get collections() {
    if (!client) {
      throw new Error('Weaviate client not initialized. Call connect() first');
    }
    return client.collections;
  },

  async connect() {
    if (client) return client;
    
    if (isConnecting) {
      // If already connecting, wait for the promise to resolve
      if (clientPromise) {
        return await clientPromise;
      }
    }

    try {
      isConnecting = true;
      if (!clientPromise) {
        clientPromise = initClient();
      }
      client = await clientPromise;
      return client;
    } catch (error) {
      // Reset on error so next attempt can try again
      clientPromise = null;
      client = null;
      throw error;
    } finally {
      isConnecting = false;
    }
  },

  close() {
    if (client) {
      client.close();
      client = null;
      clientPromise = null;
      isConnecting = false;
    }
  }
}; 