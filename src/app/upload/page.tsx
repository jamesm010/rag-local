'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Define the structure for a single document expected in the JSON file
interface DocumentInput {
  id?: string; // Optional: Weaviate can auto-generate IDs
  properties: Record<string, unknown>;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [className, setClassName] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target?.files?.[0]) {
      setFile(event.target.files[0]);
      setStatusMessage(''); // Clear previous status messages
    } else {
      setFile(null);
    }
  };

  const handleClassNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    setClassName(event.target.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage('');

    if (!file) {
      setStatusMessage('Please select a JSON file to upload.');
      toast.error("Please select a JSON file.");
      return;
    }

    if (!className.trim()) {
      setStatusMessage('Please enter the Weaviate class name.');
      toast.error("Please enter a class name.");
      return;
    }

    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target?.result;
      if (typeof text !== 'string') {
        setStatusMessage('Failed to read file content.');
        toast.error("Failed to read file content.");
        setIsLoading(false);
        return;
      }

      let documents: DocumentInput[];
      try {
        const parsedData = JSON.parse(text);
        // Basic validation: Check if it's an array
        if (!Array.isArray(parsedData)) {
          throw new Error('JSON content must be an array of documents.');
        }
        // Further validation could be added here to check document structure
        documents = parsedData;

      } catch (error) {
        console.error("JSON parsing error:", error);
        const errorMsg = error instanceof Error ? error.message : 'Invalid JSON format.';
        setStatusMessage(`Error parsing JSON file: ${errorMsg}`);
        toast.error(`Error parsing JSON: ${errorMsg}`);
        setIsLoading(false);
        return;
      }

      // Prepare the request body
      const requestBody = {
        documents,
        className,
      };

      try {
        console.log(`Sending ${documents.length} documents to class ${className}...`);
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('Upload failed:', result);
          throw new Error(result.error || result.details || 'Upload failed');
        }

        console.log('Upload successful:', result);
        setStatusMessage(result.message || 'Upload successful!');
        toast.success(result.message || `Successfully imported ${documents.length} documents.`);
        setFile(null); // Clear file input on success
        // Optionally clear class name too: setClassName('');
      } catch (error) { // Explicitly catch any error during fetch/processing
        console.error("Upload error:", error);
        const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred';
        setStatusMessage(`Upload failed: ${errorMsg}`);
        toast.error(`Upload failed: ${errorMsg}`);
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setStatusMessage('Error reading file.');
      toast.error("Could not read the selected file.");
      setIsLoading(false);
    };

    reader.readAsText(file); // Read the file as text
  };

  return (
    <div className="container mx-auto p-4 flex justify-center items-start min-h-screen">
      <Card className="w-full max-w-lg mt-10">
        <CardHeader>
          <CardTitle>Upload Documents to Weaviate</CardTitle>
          <CardDescription>Select a JSON file containing documents and specify the target class name.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="json-file">JSON File</Label>
              <Input
                id="json-file"
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                disabled={isLoading}
              />
              {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
            </div>
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="class-name">Weaviate Class Name</Label>
              <Input
                id="class-name"
                type="text"
                placeholder="e.g., MyDocumentClass"
                value={className}
                onChange={handleClassNameChange}
                disabled={isLoading}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col items-start space-y-2">
            <Button type="submit" disabled={isLoading || !file || !className.trim()}>
              {isLoading ? 'Uploading...' : 'Upload to Weaviate'}
            </Button>
            {statusMessage && (
              <p className={`text-sm ${statusMessage.startsWith('Error') || statusMessage.startsWith('Upload failed') ? 'text-red-600' : 'text-green-600'}`}>
                {statusMessage}
              </p>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
} 