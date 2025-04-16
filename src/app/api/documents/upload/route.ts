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

    // Initialize the client
    await weaviateClient.connect();
    
    // Get the collection for the specified class name
    const collection = weaviateClient.collections.get(className);
    
    // Prepare batch of objects for insertion
    const batchSize = 100; // Weaviate recommends batches of 100 or fewer
    let counter = 0;
    
    // Process documents in batches
    for (let i = 0; i < documents.length; i += batchSize) {
      const batch = documents.slice(i, i + batchSize);
      console.log(`Processing batch ${i / batchSize + 1} with ${batch.length} objects...`);
      
      try {
        // Map documents to the format expected by insertMany
        const objectsToInsert = batch.map(doc => {
          const obj = {
            ...doc.properties,
          };
          if (doc.id) {
            Object.assign(obj, { id: doc.id });
          }
          return obj;
        });

        // Insert batch of objects
        await collection.data.insertMany(objectsToInsert);
        console.log(`Batch ${i / batchSize + 1} processed successfully`);
        counter += batch.length;
      } catch (batchError) {
        console.error(`Error processing batch starting at index ${i}:`, batchError);
        // Continue with next batch instead of failing completely
      }
    }

    console.log(`Successfully imported ${counter} documents.`);
    return NextResponse.json({ message: `Successfully imported ${counter} documents into ${className}.` }, { status: 201 });

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