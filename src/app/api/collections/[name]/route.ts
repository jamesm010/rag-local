import { WeaviateCollectionUtils } from '@/lib/weaviate-collection-utils';
import { type NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { name: string } }) {
  try {
    // Await the params object before accessing its properties
    const { name } = await params;
    const collectionName = name;

    // Basic validation
    if (
      !collectionName ||
      typeof collectionName !== 'string' ||
      collectionName.trim().length === 0
    ) {
      return NextResponse.json({ error: 'Invalid collection name provided' }, { status: 400 });
    }

    // Use the static create method which ensures connection is established
    let collectionUtils: WeaviateCollectionUtils;
    try {
      collectionUtils = await WeaviateCollectionUtils.create();
    } catch (error) {
      console.error('Failed to initialize WeaviateCollectionUtils:', error);
      return NextResponse.json(
        {
          error: 'Failed to initialize Weaviate client',
          details: error instanceof Error ? error.message : 'Unknown error',
        },
        { status: 500 },
      );
    }

    // Get the collection instance
    const collection = collectionUtils.getCollection(collectionName);

    // Get collection configuration
    const config = await collection.config.get();

    console.log(`API Route: Successfully fetched collection info for: ${collectionName}`);
    return NextResponse.json({ collection: config });
  } catch (error) {
    console.error('API Route Error fetching collection:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to fetch collection information', details: errorMessage },
      { status: 500 },
    );
  }
}
