import { WeaviateCollectionUtils } from '@/lib/weaviate-collection-utils';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const collectionName = body.collectionName;

    // Basic validation
    if (
      !collectionName ||
      typeof collectionName !== 'string' ||
      collectionName.trim().length === 0
    ) {
      return NextResponse.json({ error: 'Invalid collection name provided' }, { status: 400 });
    }

    // Weaviate class names must start with an uppercase letter
    if (!/^[A-Z]/.test(collectionName)) {
      return NextResponse.json(
        { error: 'Collection name must start with an uppercase letter.' },
        { status: 400 },
      );
    }

    // Initialize WeaviateCollectionUtils
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

    console.log(`API Delete Route: Attempting to delete collection: ${collectionName}`);
    await collectionUtils.deleteCollection(collectionName);

    console.log(`API Delete Route: Successfully deleted collection: ${collectionName}`);
    return NextResponse.json({ message: 'Collection deleted successfully' }, { status: 200 });
  } catch (error) {
    console.error('API Delete Route Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json(
      { error: 'Failed to delete collection', details: errorMessage },
      { status: 500 },
    );
  }
}
