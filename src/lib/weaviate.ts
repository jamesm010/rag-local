import weaviate, { type WeaviateClient } from 'weaviate-client';

// Initialize the client lazily
let client: WeaviateClient | null = null;
let clientPromise: Promise<WeaviateClient> | null = null;

async function initClient() {
  const weaviateUrl = process.env.WEAVIATE_URL;
  const weaviateApiKey = process.env.WEAVIATE_API_KEY;

  if (!weaviateUrl) {
    throw new Error('WEAVIATE_URL environment variable not set');
  }
  if (!weaviateApiKey) {
    throw new Error('WEAVIATE_API_KEY environment variable not set');
  }

  return weaviate.connectToCustom({
    httpHost: weaviateUrl.replace(/^https?:\/\//, '').split(':')[0],
    httpPort: Number.parseInt(weaviateUrl.replace(/^https?:\/\//, '').split(':')[1] || '80', 10),
    httpSecure: weaviateUrl.startsWith('https'),
    authCredentials: new weaviate.ApiKey(weaviateApiKey),
    // You might need to add headers depending on your setup, e.g., for OpenAI keys
    // headers: { 'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY || '' },
  });
}

export default {
  get collections() {
    if (!client) {
      throw new Error('Weaviate client not initialized. Call connect() first');
    }
    return client.collections;
  },
  async connect() {
    if (!client) {
      if (!clientPromise) {
        clientPromise = initClient();
      }
      client = await clientPromise;
    }
    return client;
  },
  close() {
    if (client) {
      client.close();
      client = null;
      clientPromise = null;
    }
  }
}; 