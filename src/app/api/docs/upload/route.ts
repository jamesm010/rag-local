/**
 * API route for uploading and indexing documents to Weaviate
 * Handles scanning files, tracking progress, and uploading to vector database
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import weaviateClient from '@/lib/weaviate';
import WeaviateCollectionUtils from '@/lib/weaviate-collection-utils';
import WeaviateObjectUtils from '@/lib/weaviate-object-utils';
import { NextResponse } from 'next/server';
import type { Properties } from 'weaviate-client';

/**
 * File paths and configuration constants
 */
const PROGRESS_FILE_PATH = path.join(process.cwd(), '.temp', 'upload-progress.json');
const DOCS_DIR = path.join(process.cwd(), 'public', 'docs');
const DEFAULT_COLLECTION_NAME = 'UploadedDocs';
const SUPPORTED_EXTENSIONS = ['.txt', '.md', '.json']; // Add more as needed
const BATCH_SIZE = 20; // Maximum number of files to process in a single batch

/**
 * Interface for tracking the current state of document upload process
 * This is persisted to disk to allow for resuming and status checking
 */
interface ProgressState {
  /** Current status of the upload process */
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  /** Name of the Weaviate collection being used */
  collectionName: string;
  /** Total number of files found in the directory */
  totalFiles: number;
  /** Number of files that have been attempted to be read/processed */
  filesProcessed: number;
  /** Number of files successfully added to the upload batch */
  filesUploaded: number;
  /** List of file paths that were successfully uploaded */
  uploadedFilePaths: string[];
  /** List of files that failed to process with error messages */
  failedFiles: { filepath: string; error: string }[];
  /** ISO timestamp when the upload process started */
  startTime: string | null;
  /** ISO timestamp when the upload process ended */
  endTime: string | null;
  /** Error message if the process failed */
  error: string | null;
}

// --- Helper Functions ---

/**
 * Reads the current progress state from the filesystem
 * @returns The current ProgressState, or a new initialized state if file doesn't exist
 */
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

/**
 * Writes the progress state to the filesystem
 * Creates the directory if it doesn't exist
 * @param state The current progress state to save
 */
async function writeProgress(state: ProgressState): Promise<void> {
  try {
    // Ensure directory exists
    await fs.mkdir(path.dirname(PROGRESS_FILE_PATH), { recursive: true });
    await fs.writeFile(PROGRESS_FILE_PATH, JSON.stringify(state, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing progress file:', error);
  }
}

/**
 * Creates a new initialized progress state with default values
 * @returns A new empty ProgressState object
 */
function initializeProgressState(): ProgressState {
  return {
    status: 'pending',
    collectionName: DEFAULT_COLLECTION_NAME,
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

/**
 * Recursively scans a directory for files
 * @param dirPath Directory path to scan
 * @returns Array of absolute file paths found in the directory
 */
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
/**
 * Interface for document properties stored in Weaviate
 * Maps file metadata and content to Weaviate schema
 */
interface DocumentProperties {
  /** Name of the document file */
  filename: string;
  /** Relative path used as identifier */
  filepath: string;
  /** Text content of the document */
  content: string;
  /** File type extension (e.g., 'txt', 'md', 'json') */
  filetype: string;
  /** ISO timestamp of when the file was last modified */
  lastModified: string;
  /** Additional properties for compatibility with Weaviate Properties type */
  [key: string]: any;
}

// --- Route Handler ---

/**
 * POST handler for uploading documents to Weaviate
 * Processes files from the DOCS_DIR directory and uploads them to Weaviate
 *
 * Request parameters:
 * - collection: (optional) Name of the Weaviate collection to use (defaults to 'UploadedDocs')
 *
 * @param request The incoming request with optional search params
 * @returns JSON response with upload status and progress information
 */
export async function POST(request: Request) {
  // Extract collection name from URL parameters or use default
  const { searchParams } = new URL(request.url);
  const collectionName = searchParams.get('collection') || DEFAULT_COLLECTION_NAME;

  let progress = await readProgress();

  // Prevent concurrent runs if one is already in progress
  if (progress.status === 'in-progress') {
    return NextResponse.json(
      { message: 'Upload already in progress.', progress },
      { status: 409 }, // Conflict
    );
  }

  // Initialize a new progress state for this run
  progress = initializeProgressState();
  progress.status = 'in-progress';
  progress.collectionName = collectionName;
  progress.startTime = new Date().toISOString();
  await writeProgress(progress);

  try {
    /**
     * Step 1: Initialize Weaviate client and utilities
     */
    await weaviateClient.connect();
    const collectionUtils = await WeaviateCollectionUtils.create();
    const objectUtils = new WeaviateObjectUtils(); // Uses the connected client internally

    /**
     * Step 2: Ensure the target collection exists
     * Creates it with required schema if it doesn't
     */
    const collections = await collectionUtils.listAllCollections();
    const collectionExists = collections.some((c) => c.name === collectionName);

    if (!collectionExists) {
      console.log(`Collection '${collectionName}' not found, creating...`);
      await collectionUtils.createCollection<DocumentProperties, string>({
        name: collectionName,
        properties: [
          { name: 'filename', dataType: 'text' },
          { name: 'filepath', dataType: 'text' },
          { name: 'content', dataType: 'text' },
          { name: 'filetype', dataType: 'text' },
          { name: 'lastModified', dataType: 'date' },
        ],
        // No vectorizer specified - will use default
      });
      console.log(`Collection '${collectionName}' created.`);
    }

    /**
     * Step 3: Scan the document directory for files to process
     * Creates directory if it doesn't exist
     */
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

    /**
     * Step 4: Process files in batches and upload to Weaviate
     * Reads file content, extracts metadata, and uploads in batches of BATCH_SIZE
     */
    let currentBatch: DocumentProperties[] = [];
    let batchNumber = 0;
    const totalBatches = Math.ceil(allFilePaths.length / BATCH_SIZE);

    // Process files in batches
    for (let i = 0; i < allFilePaths.length; i++) {
      const fullPath = allFilePaths[i];
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

        currentBatch.push({
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

      // If we've reached the batch size or this is the last file, upload the current batch
      if (currentBatch.length >= BATCH_SIZE || i === allFilePaths.length - 1) {
        batchNumber++;
        if (currentBatch.length > 0) {
          try {
            console.log(
              `Uploading batch ${batchNumber}/${totalBatches} with ${currentBatch.length} objects...`,
            );
            const results = await objectUtils.createObjects(
              collectionName,
              currentBatch as Properties[],
            );
            console.log(`Batch ${batchNumber} upload complete. Result count: ${results.length}`);
          } catch (uploadError: any) {
            console.error(`Error during batch ${batchNumber} upload:`, uploadError);
            progress.error = `Weaviate Upload Error in batch ${batchNumber}: ${uploadError.message}`;
            // Mark all files in this batch as failed
            progress.failedFiles.push(
              ...currentBatch.map((obj) => ({
                filepath: obj.filepath,
                error: `Upload Failed in batch ${batchNumber}: ${uploadError.message}`,
              })),
            );
            // Adjust the counts to reflect the failed batch
            progress.filesUploaded -= currentBatch.length;
            // Remove the failed files from uploadedFilePaths
            progress.uploadedFilePaths = progress.uploadedFilePaths.filter(
              (path) => !currentBatch.some((obj) => obj.filepath === path),
            );
          }
        }
        // Clear the batch for the next iteration
        currentBatch = [];
        // Write progress after each batch
        await writeProgress(progress);
      }
    }

    /**
     * Step 5: Finalize progress and return results
     */
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

/**
 * GET handler to retrieve the current progress of document uploads
 * Returns the current state of the upload process
 *
 * Request parameters:
 * - collection: (optional) Filter progress by specific collection name
 *
 * @param request The incoming request with optional search params
 * @returns JSON response with the current progress state or error message
 */
export async function GET(request: Request) {
  try {
    const progress = await readProgress();

    // Filter by collection if specified
    const { searchParams } = new URL(request.url);
    const requestedCollection = searchParams.get('collection');

    if (requestedCollection && progress.collectionName !== requestedCollection) {
      return NextResponse.json({
        message: `No active upload for collection '${requestedCollection}'`,
        status: 'not_found',
      });
    }

    return NextResponse.json(progress);
  } catch (error: any) {
    return NextResponse.json(
      { message: 'Could not read progress file.', error: error.message },
      { status: 500 },
    );
  }
}
