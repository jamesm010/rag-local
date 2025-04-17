import { NextResponse } from 'next/server';
import { WeaviateCollectionUtils } from '@/lib/weaviate-collection-utils';

export async function GET() {
  try {
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
    
    // Fetch all collections
    const allCollections = await collectionUtils.listAllCollections();

    // Extract just the names
    const collectionNames = allCollections.map(c => c.name);

    console.log(`API Route: Fetched ${collectionNames.length} collection names.`);
    return NextResponse.json({ collections: collectionNames });

  } catch (error) {
    console.error('API Route Error fetching collections:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: 'Failed to fetch collections', details: errorMessage }, { status: 500 });
  }
}

// Optional: Add configuration if needed, e.g., for edge runtime
// export const runtime = 'edge'; // Example 