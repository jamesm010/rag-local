import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";

// Promisify fs functions
const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

// Type definitions
interface FileInfo {
  name: string;
  path: string;
  type: string;
  size: number;
  lastModified: Date;
  isDirectory: boolean;
  children?: FileInfo[]; // For directories
}

/**
 * Recursively scans a directory and returns information about all files and subdirectories
 */
async function scanDirectory(dirPath: string, relativePath = ""): Promise<FileInfo[]> {
  const entries = await readdir(dirPath);
  const results: FileInfo[] = [];

  // Process all entries in parallel for better performance
  const entriesPromises = entries.map(async (entry) => {
    const fullPath = path.join(dirPath, entry);
    const entryStats = await stat(fullPath);
    const isDirectory = entryStats.isDirectory();

    // Create relative path for client access
    const entryRelativePath = path.join(relativePath, entry).replace(/\\/g, "/");

    // Base file info
    const fileInfo: FileInfo = {
      name: entry,
      path: `/${entryRelativePath}`, // Path relative to public directory for client access
      type: isDirectory ? "directory" : path.extname(entry).toLowerCase().slice(1) || "unknown",
      size: entryStats.size,
      lastModified: entryStats.mtime,
      isDirectory,
    };

    // If it's a directory, recursively scan it
    if (isDirectory) {
      fileInfo.children = await scanDirectory(fullPath, entryRelativePath);
    }

    return fileInfo;
  });

  // Await all entries processing
  const processedEntries = await Promise.all(entriesPromises);
  return processedEntries;
}

/**
 * GET handler for /api/docs endpoint
 * Returns information about files in the public/docs directory
 */
export async function GET() {
  try {
    // Path to the docs directory
    const docsDir = path.join(process.cwd(), "public", "docs");

    // Check if directory exists
    if (!fs.existsSync(docsDir)) {
      console.log("Docs directory does not exist:", docsDir);

      // Create the directory if it doesn't exist
      try {
        fs.mkdirSync(docsDir, { recursive: true });
        console.log("Created docs directory:", docsDir);
      } catch (createError) {
        console.error("Failed to create docs directory:", createError);
      }

      return NextResponse.json({
        files: [],
        filesByType: {},
        count: 0,
        message: "Docs directory did not exist and was created",
      });
    }

    // Scan directory recursively
    const fileTree = await scanDirectory(docsDir, "docs");

    // Flatten the file tree for the files array (excluding directories)
    const flattenFileTree = (entries: FileInfo[]): FileInfo[] => {
      let result: FileInfo[] = [];

      for (const entry of entries) {
        if (!entry.isDirectory) {
          // Add file to the result
          result.push(entry);
        } else if (entry.children) {
          // Recursively process children of directories
          result = result.concat(flattenFileTree(entry.children));
        }
      }

      return result;
    };

    const allFiles = flattenFileTree(fileTree);

    console.log(`Found ${allFiles.length} files in docs directory`);

    // Group files by type
    const filesByType: Record<string, FileInfo[]> = {};
    for (const file of allFiles) {
      if (!filesByType[file.type]) {
        filesByType[file.type] = [];
      }
      filesByType[file.type].push(file);
    }

    return NextResponse.json({
      fileTree, // The hierarchical file structure
      files: allFiles, // Flat list of all files (no directories)
      filesByType, // Files grouped by type
      count: allFiles.length,
      message: `Successfully retrieved ${allFiles.length} files from docs directory`,
    });
  } catch (error) {
    console.error("Error reading docs directory:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Failed to read docs directory",
        details: errorMessage,
      },
      { status: 500 },
    );
  }
}
