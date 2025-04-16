import weaviate, { ApiKey, type WeaviateClient } from 'weaviate-ts-client';

const weaviateUrl = process.env.WEAVIATE_URL;
const weaviateApiKey = process.env.WEAVIATE_API_KEY;

if (!weaviateUrl) {
  throw new Error('WEAVIATE_URL environment variable not set');
}
if (!weaviateApiKey) {
    throw new Error('WEAVIATE_API_KEY environment variable not set');
}

const client: WeaviateClient = weaviate.client({
  scheme: weaviateUrl.startsWith('https') ? 'https' : 'http',
  host: weaviateUrl.replace(/^https?:\/\//, ''),
  apiKey: new ApiKey(weaviateApiKey),
  // You might need to add headers depending on your setup, e.g., for OpenAI keys
  // headers: { 'X-OpenAI-Api-Key': process.env.OPENAI_API_KEY || '' },
});

export default client; 