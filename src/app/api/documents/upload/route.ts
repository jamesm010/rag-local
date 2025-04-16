import { type NextRequest, NextResponse } from 'next/server';
import weaviateClient from '@/lib/weaviate';

// Define the expected structure for a single document
interface DocumentInput {
  id?: string; // Optional: Weaviate can auto-generate IDs
  properties: Record<string, unknown>;
  // Add vector if you are providing your own vectors
  // vector?: number[];
}

// Define the expected request body structure
interface UploadRequestBody {
  documents: DocumentInput[];
  className: string; // Class name to upload documents to
}

export async function POST(request: NextRequest) {
  console.log("Received request to /api/documents/upload");
  try {
    const body: UploadRequestBody = await request.json();
    const { documents, className } = body;

    if (!Array.isArray(documents) || documents.length === 0) {
      console.error('Invalid request: documents array is missing or empty');
      return NextResponse.json({ error: "Request body must contain a non-empty 'documents' array" }, { status: 400 });
    }
    if (!className || typeof className !== 'string') {
      console.error('Invalid request: className is missing or not a string');
      return NextResponse.json({ error: "Request body must contain a valid 'className' string" }, { status: 400 });
    }

    console.log(`Attempting to batch import ${documents.length} documents into class: ${className}`);

    let batcher = weaviateClient.batch.objectsBatcher();
    let counter = 0;
    const batchSize = 100; // Weaviate recommends batches of 100 or fewer

    for (const doc of documents) {
      const weaviateObject = {
        class: className,
        properties: doc.properties,
        // id: doc.id, // Uncomment if providing your own UUIDs
        // vector: doc.vector // Uncomment if providing your own vectors
      };

      batcher = batcher.withObject(weaviateObject);
      counter++;

      // Flush batch if size limit reached
      if (counter % batchSize === 0) {
        console.log(`Flushing batch at ${counter} objects...`);
        const results = await batcher.do();
        console.log('Batch flushed. Results:', JSON.stringify(results, null, 2));
        // Check for errors in batch results
        for (const result of results) {
          if (result.result?.errors) {
            console.error(`Error in batch item: ${JSON.stringify(result.result.errors)}`);
            // Consider more robust error handling here
          }
        }
        // Re-initialize batcher
        batcher = weaviateClient.batch.objectsBatcher();
      }
    }

    // Flush remaining items
    if (counter % batchSize !== 0) {
      console.log(`Flushing remaining ${counter % batchSize} objects...`);
      const results = await batcher.do();
      console.log('Final batch flushed. Results:', JSON.stringify(results, null, 2));
      // Check for errors in final batch results
      for (const result of results) {
        if (result.result?.errors) {
          console.error(`Error in final batch item: ${JSON.stringify(result.result.errors)}`);
          // Consider more robust error handling here
        }
      }
    }

    console.log(`Successfully imported ${documents.length} documents.`);
    return NextResponse.json({ message: `Successfully imported ${documents.length} documents into ${className}.` }, { status: 201 });

  } catch (error: unknown) {
    console.error('Error processing Weaviate upload:', error);
    if (error instanceof SyntaxError) { // JSON parsing error
      return NextResponse.json({ error: 'Invalid JSON format in request body' }, { status: 400 });
    }
    // Improved error detail extraction
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: 'Failed to upload documents to Weaviate', details: errorMessage }, { status: 500 });
  }
} 