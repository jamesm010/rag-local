import fs from 'node:fs/promises';
import path from 'node:path';
import weaviateClient from '@/lib/weaviate';
import WeaviateCollectionUtils from '@/lib/weaviate-collection-utils';
import WeaviateObjectUtils from '@/lib/weaviate-object-utils';
import { NextResponse } from 'next/server';
// We might need the scanDirectory function or similar logic
// import { scanDirectory } from '../route'; // Adjust path if needed

const PROGRESS_FILE_PATH = path.join(process.cwd(), '.temp', 'upload-progress.json');
const DOCS_DIR = path.join(process.cwd(), 'public', 'docs');
const COLLECTION_NAME = 'UploadedDocs';
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.json']; // Add more as needed

interface ProgressState {
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  totalFiles: number;
  filesProcessed: number; // Files attempted to be read/processed
  filesUploaded: number; // Files successfully added to batch
  uploadedFilePaths: string[];
  failedFiles: { filepath: string; error: string }[];
  startTime: string | null;
  endTime: string | null;
  error: string | null;
}

// --- Helper Functions ---

async function readProgress(): Promise<ProgressState> {
  try {
    const data = await fs.readFile(PROGRESS_FILE_PATH, 'utf-8');
    return JSON.parse(data);
  } catch (error: any) {
    // If file doesn't exist or is invalid JSON, return initial state
    if (error.code === 'ENOENT') {
      return initializeProgressState();
    }
    console.warn('Error reading progress file, resetting:', error);
    return initializeProgressState();
  }
}

async function writeProgress(state: ProgressState): Promise<void> {
  try {
    await fs.writeFile(PROGRESS_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing progress file:', error);
  }
}

function initializeProgressState(): ProgressState {
  return {
    status: 'pending',
    totalFiles: 0,
    filesProcessed: 0,
    filesUploaded: 0,
    uploadedFilePaths: [],
    failedFiles: [],
    startTime: null,
    endTime: null,
    error: null,
  };
}

// Simplified file scanner (adapt scanDirectory from api/docs/route.ts if needed)
async function scanDocsDirectory(dirPath: string): Promise<string[]> {
  let fileList: string[] = [];
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        fileList = fileList.concat(await scanDocsDirectory(fullPath));
      } else if (entry.isFile()) {
        fileList.push(fullPath);
      }
    }
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
    // If the docs dir itself fails, throw up
    if (dirPath === DOCS_DIR) throw error;
  }
  return fileList;
}

// --- Weaviate Schema ---
interface DocumentProperties {
  filename: string;
  filepath: string; // Relative path used as identifier
  content: string;
  filetype: string;
  lastModified: string; // ISO string date
}

// --- Route Handler ---

export async function POST() {
  let progress = await readProgress();

  // Prevent concurrent runs if one is already in progress
  if (progress.status === 'in-progress') {
    return NextResponse.json(
      { message: 'Upload already in progress.', progress },
      { status: 409 }, // Conflict
    );
  }

  // Reset progress state for a new run
  progress = initializeProgressState();
  progress.status = 'in-progress';
  progress.startTime = new Date().toISOString();
  await writeProgress(progress);

  try {
    // 1. Connect to Weaviate using your wrapper
    await weaviateClient.connect();
    const collectionUtils = await WeaviateCollectionUtils.create();
    const objectUtils = new WeaviateObjectUtils(); // Uses the connected client internally

    // 2. Ensure Collection Exists
    const collections = await collectionUtils.listAllCollections();
    const collectionExists = collections.some((c) => c.name === COLLECTION_NAME);

    if (!collectionExists) {
      console.log(`Collection '${COLLECTION_NAME}' not found, creating...`);
      await collectionUtils.createCollection<DocumentProperties, typeof COLLECTION_NAME>({
        name: COLLECTION_NAME,
        properties: [
          { name: 'filename', dataType: 'text' },
          { name: 'filepath', dataType: 'text' },
          { name: 'content', dataType: 'text' },
          { name: 'filetype', dataType: 'text' },
          { name: 'lastModified', dataType: 'date' },
        ],
        // Basic vectorizer config - use vectorizers (plural) and structure
        vectorizers: {
          // Corrected: plural
          name: 'text2vec-contextionary', // Assuming this is configured
          // Add specific config if needed, e.g.,
          // config: {
          //    vectorizeClassName: false
          // }
        },
      });
      console.log(`Collection '${COLLECTION_NAME}' created.`);
    }

    // 3. Scan Files
    let allFilePaths: string[] = [];
    try {
      allFilePaths = await scanDocsDirectory(DOCS_DIR);
    } catch (scanError: any) {
      if (scanError.code === 'ENOENT') {
        console.log(`Docs directory ${DOCS_DIR} not found.`);
        try {
          await fs.mkdir(DOCS_DIR, { recursive: true });
          console.log(`Created directory: ${DOCS_DIR}`);
        } catch (mkdirError) {
          console.error(`Failed to create directory ${DOCS_DIR}:`, mkdirError);
          // Fail the process if directory creation fails
          throw new Error(`Failed to ensure existence of directory: ${DOCS_DIR}`);
        }
        // No files to process yet if directory was just created
      } else {
        throw scanError; // Re-throw other scanning errors
      }
    }

    progress.totalFiles = allFilePaths.length;
    await writeProgress(progress);

    const objectsToUpload: DocumentProperties[] = [];

    // 4. Process Files
    for (const fullPath of allFilePaths) {
      const relativePath = path.relative(DOCS_DIR, fullPath).replace(/\\/g, '/'); // Fix: Escape backslash in replace
      const ext = path.extname(fullPath).toLowerCase();

      progress.filesProcessed++;

      if (!SUPPORTED_EXTENSIONS.includes(ext)) {
        progress.failedFiles.push({
          filepath: relativePath,
          error: `Unsupported file type: ${ext}`,
        });
        continue;
      }

      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        const stats = await fs.stat(fullPath);

        objectsToUpload.push({
          filename: path.basename(fullPath),
          filepath: relativePath, // Use relative path as unique ID source
          content: content,
          filetype: ext.slice(1),
          lastModified: stats.mtime.toISOString(),
        });
        progress.filesUploaded++; // Count successful reads ready for upload
        progress.uploadedFilePaths.push(relativePath);
      } catch (readError: any) {
        console.error(`Failed to read or process file ${relativePath}:`, readError);
        progress.failedFiles.push({
          filepath: relativePath,
          error: `Read/Stat Error: ${readError.message}`,
        });
      }
    }
    // Write progress once after processing loop
    await writeProgress(progress);

    // 5. Batch Upload using WeaviateObjectUtils.createObjects
    if (objectsToUpload.length > 0) {
      try {
        console.log(
          `Attempting to upload ${objectsToUpload.length} objects using createObjects...`,
        );
        // Assuming createObjects handles potential errors internally or throws
        const results = await objectUtils.createObjects(COLLECTION_NAME, objectsToUpload);
        // The createObjects method using Promise.all might not give detailed per-object errors easily
        // If it resolves, assume success for progress tracking for now.
        console.log(`Upload using createObjects finished. Result count: ${results.length}`);
      } catch (uploadError: any) {
        console.error('Error during Weaviate createObjects call:', uploadError);
        progress.error = `Weaviate Upload Error: ${uploadError.message}`;
        // Mark all files intended for this batch as failed in progress?
        // Add a general upload error message to progress.
        progress.failedFiles.push(
          ...objectsToUpload.map((obj) => ({
            filepath: obj.filepath,
            error: `Upload Failed: ${uploadError.message}`,
          })),
        );
        progress.filesUploaded = 0; // Reset count as the batch failed
        progress.uploadedFilePaths = [];
      }
    } else {
      console.log('No new valid documents found to upload.');
    }

    // 6. Finalize Progress
    progress.status = progress.error ? 'failed' : 'completed';
    progress.endTime = new Date().toISOString();
    await writeProgress(progress);

    console.log('Upload process finished. Final state:', progress);

    return NextResponse.json({
      message: `Upload process ${progress.status}. Processed ${progress.filesProcessed}/${progress.totalFiles} files. Uploaded ${progress.filesUploaded}. Failed: ${progress.failedFiles.length}.`,
      progress,
    });
  } catch (error: any) {
    console.error('Unhandled error in upload route:', error);
    progress.status = 'failed';
    progress.error = `Unexpected Error: ${error.message}`;
    progress.endTime = new Date().toISOString();
    await writeProgress(progress);
    return NextResponse.json(
      { message: 'Upload failed due to an unexpected error.', error: error.message, progress },
      { status: 500 },
    );
  } finally {
    // Optional: Close Weaviate client connection if necessary?
    // Your wrapper might handle this - check its implementation.
    // weaviateClient.close();
  }
}

// Add GET handler to retrieve current progress?
export async function GET() {
  try {
    const progress = await readProgress();
    return NextResponse.json(progress);
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Could not read progress file.', error: error.message },
      { status: 500 },
    );
  }
}
