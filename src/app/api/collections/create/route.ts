import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { WeaviateCollectionUtils } from '@/lib/weaviate-collection-utils';
import weaviateClient from '@/lib/weaviate';
import type { CollectionConfigCreate, Properties } from 'weaviate-client';

export async function POST(request: NextRequest) {
  try {

    const body = await request.json();
    const collectionName = body.collectionName;

    // Basic validation
    if (!collectionName || typeof collectionName !== 'string' || collectionName.trim().length === 0) {
      return NextResponse.json({ error: 'Invalid collection name provided' }, { status: 400 });
    }

    // Weaviate class names must start with an uppercase letter
    if (!/^[A-Z]/.test(collectionName)) {
        return NextResponse.json({ error: 'Collection name must start with an uppercase letter.' }, { status: 400 });
    }

    // Use the static create method which ensures connection is established
    let collectionUtils: WeaviateCollectionUtils;
    try {
      collectionUtils = await WeaviateCollectionUtils.create();
    } catch (error) {
      console.error('Failed to initialize WeaviateCollectionUtils:', error);
      return NextResponse.json({ 
        error: 'Failed to initialize Weaviate client',
        details: error instanceof Error ? error.message : 'Unknown error' 
      }, { status: 500 });
    }

    // Define a minimal collection configuration
    // Explicitly type the config with Properties and string generics.
    const config: CollectionConfigCreate<Properties, string> = {
      name: collectionName,
      properties: [], // Explicitly pass empty properties array
      // Add other default configurations if needed, e.g.,
      // vectorizerConfig: weaviate.configure.vectorizer.text2VecOpenAI(),
    };

    console.log(`API Create Route: Attempting to create collection: ${collectionName}`);
    // Call createCollection with the correctly typed config
    // The generics <Properties, string> are inferred here but can be added explicitly if needed:
    // await collectionUtils.createCollection<Properties, string>(config);
    const newCollection = await collectionUtils.createCollection(config);

    console.log(`API Create Route: Successfully created collection: ${collectionName}`);
    return NextResponse.json({ message: 'Collection created successfully', collection: newCollection }, { status: 201 });

  } catch (error) {
    console.error('API Create Route Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    // Check for specific Weaviate errors if possible, e.g., collection already exists
    // This might require inspecting the error object structure from the Weaviate client
    return NextResponse.json({ error: 'Failed to create collection', details: errorMessage }, { status: 500 });
  }
}
