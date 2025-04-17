'use client';

import { useState, useEffect, type ChangeEvent, type FormEvent } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"; // Import icons

import { cn } from "@/lib/utils";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger, // Keep if needed, but we trigger programmatically
} from "@/components/ui/dialog";

// Define the structure for a single document expected in the JSON file
interface DocumentInput {
  id?: string; // Optional: Weaviate can auto-generate IDs
  properties: Record<string, unknown>;
}

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  // const [className, setClassName] = useState<string>(''); // Replaced by selectedCollection
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // State for collections combobox
  const [collections, setCollections] = useState<string[]>([]);
  const [isFetchingCollections, setIsFetchingCollections] = useState<boolean>(true);
  const [selectedCollection, setSelectedCollection] = useState<string>(""); // Holds the chosen collection name
  const [openCombobox, setOpenCombobox] = useState(false);

  // State for create collection dialog
  const [openDialog, setOpenDialog] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  // Fetch collections on mount
  useEffect(() => {
    const fetchCollections = async () => {
      setIsFetchingCollections(true);
      try {
        const response = await fetch('/api/collections');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch collections');
        }
        const data = await response.json();
        setCollections(data.collections || []);
        console.log("Fetched collections:", data.collections);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred';
        toast.error(`Error fetching collections: ${errorMsg}`);
        console.error("Error fetching collections:", error);
        setCollections([]); // Ensure collections is empty on error
      } finally {
        setIsFetchingCollections(false);
      }
    };

    fetchCollections();
  }, []); // Empty dependency array means run once on mount


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target?.files?.[0]) {
      setFile(event.target.files[0]);
      setStatusMessage(''); // Clear previous status messages
    } else {
      setFile(null);
    }
  };

  // Remove handleClassNameChange as it's replaced by Combobox selection

  const handleCreateCollection = async () => {
    const trimmedName = newCollectionName.trim();
    if (!trimmedName) {
        toast.error("Please enter a name for the new collection.");
        return;
    }
     if (!/^[A-Z]/.test(trimmedName)) {
        toast.error("Collection name must start with an uppercase letter.");
        return;
    }

    setIsCreatingCollection(true);
    setStatusMessage(''); // Clear previous status

    try {
      console.log(`Attempting to create collection: ${trimmedName}`);
      const response = await fetch('/api/collections/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collectionName: trimmedName }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('Create collection failed:', result);
        throw new Error(result.error || result.details || 'Failed to create collection');
      }

      console.log('Collection created successfully:', result);
      toast.success(`Collection "${trimmedName}" created successfully!`);

      // Update state: add new collection, select it, close dialog
      setCollections(prev => [...prev, trimmedName].sort()); // Add and sort
      setSelectedCollection(trimmedName);
      setOpenDialog(false);
      setNewCollectionName(''); // Clear input

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'An unknown error occurred';
      setStatusMessage(`Error creating collection: ${errorMsg}`);
      toast.error(`Creation failed: ${errorMsg}`);
      console.error("Create collection error:", error);
    } finally {
      setIsCreatingCollection(false);
    }
  };


  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatusMessage('');

    if (!file) {
      setStatusMessage('Please select a JSON file to upload.');
      toast.error("Please select a JSON file.");
      return;
    }

    // Use selectedCollection instead of className
    if (!selectedCollection) {
      setStatusMessage('Please select a Weaviate collection.');
      toast.error("Please select a collection.");
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
        if (!Array.isArray(parsedData)) {
          throw new Error('JSON content must be an array of documents.');
        }
        documents = parsedData;
      } catch (error) {
        console.error("JSON parsing error:", error);
        const errorMsg = error instanceof Error ? error.message : 'Invalid JSON format.';
        setStatusMessage(`Error parsing JSON file: ${errorMsg}`);
        toast.error(`Error parsing JSON: ${errorMsg}`);
        setIsLoading(false);
        return;
      }

      // Prepare the request body using selectedCollection
      const requestBody = {
        documents,
        className: selectedCollection, // Use selected collection here
      };

      try {
        console.log(`Sending ${documents.length} documents to collection ${selectedCollection}...`); // Log selected collection
        const response = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error('Upload failed:', result);
          throw new Error(result.error || result.details || 'Upload failed');
        }

        console.log('Upload successful:', result);
        setStatusMessage(result.message || 'Upload successful!');
        toast.success(result.message || `Successfully imported ${documents.length} documents to ${selectedCollection}.`); // Include collection name
        setFile(null); // Clear file input on success
        // Optionally clear collection selection: setSelectedCollection('');
      } catch (error) {
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
          <CardDescription>Select a JSON file, choose or create a Weaviate collection, and upload.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {/* File Input */}
            <div className="grid w-full max-w-sm items-center gap-1.5">
              <Label htmlFor="json-file">JSON File</Label>
              <Input
                id="json-file"
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                disabled={isLoading || isFetchingCollections || isCreatingCollection}
              />
              {file && <p className="text-sm text-muted-foreground">Selected: {file.name}</p>}
            </div>

            {/* Collection Combobox */}
            <div className="grid w-full max-w-sm items-center gap-1.5">
               <Label htmlFor="collection-combobox">Weaviate Collection</Label>
               <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                 <PopoverTrigger asChild>
                   <Button
                     variant="outline"
                     role="combobox"
                     aria-expanded={openCombobox}
                     className="w-full justify-between"
                     disabled={isLoading || isFetchingCollections || isCreatingCollection}
                     id="collection-combobox"
                   >
                     {selectedCollection
                       ? selectedCollection
                       : isFetchingCollections ? "Loading collections..." : "Select collection..."}
                     <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                   </Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-[--radix-popover-trigger-width] max-h-[--radix-popover-content-available-height] p-0">
                    <Command>
                      <CommandInput placeholder="Search collection..." />
                       {/* biome-ignore lint/a11y/useSemanticElements: Shadcn Combobox pattern uses CommandList */} 
                       {/* eslint-disable-next-line jsx-a11y/interactive-supports-focus, jsx-a11y/aria-proptypes */}
                       <CommandList>
                          <CommandEmpty>
                            {isFetchingCollections ? "Loading..." : "No collection found."}
                          </CommandEmpty>
                          <CommandGroup heading="Collections">
                            {collections.map((collectionName) => (
                              <CommandItem
                                key={collectionName}
                                value={collectionName}
                                onSelect={(currentValue) => {
                                  setSelectedCollection(currentValue === selectedCollection ? "" : currentValue);
                                  setOpenCombobox(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-4 w-4",
                                    selectedCollection === collectionName ? "opacity-100" : "opacity-0"
                                  )}
                                />
                                {collectionName}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                          <CommandSeparator />
                          <CommandGroup>
                            <button 
                              type="button"
                              className="flex w-full items-center px-2 py-1.5 text-sm text-muted-foreground cursor-pointer hover:bg-accent hover:text-accent-foreground rounded-sm"
                              onClick={() => {
                                setOpenCombobox(false);
                                setOpenDialog(true);
                              }}
                            >
                              <PlusCircle className="mr-2 h-4 w-4" />
                              Create new collection...
                            </button>
                          </CommandGroup>
                      </CommandList>
                    </Command>
                 </PopoverContent>
               </Popover>
             </div>

          </CardContent>
          <CardFooter className="flex flex-col items-start space-y-2">
            <Button type="submit" disabled={isLoading || isFetchingCollections || isCreatingCollection || !file || !selectedCollection}>
              {isLoading ? 'Uploading...' : 'Upload to Weaviate'}
            </Button>
            {statusMessage && (
              <p className={`text-sm ${statusMessage.startsWith('Error') || statusMessage.startsWith('Upload failed') || statusMessage.startsWith('Creation failed:') ? 'text-red-600' : 'text-green-600'}`}>
                {statusMessage}
              </p>
            )}
          </CardFooter>
        </form>
      </Card>

      {/* Create Collection Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
         <DialogContent className="sm:max-w-[425px]">
           <DialogHeader>
             <DialogTitle>Create New Weaviate Collection</DialogTitle>
             <DialogDescription>
               Enter a name for your new collection. It must start with an uppercase letter.
             </DialogDescription>
           </DialogHeader>
           <div className="grid gap-4 py-4">
             <div className="grid grid-cols-4 items-center gap-4">
               <Label htmlFor="new-collection-name" className="text-right">
                 Name
               </Label>
               <Input
                 id="new-collection-name"
                 value={newCollectionName}
                 onChange={(e) => setNewCollectionName(e.target.value)}
                 placeholder="MyNewCollection"
                 className="col-span-3"
                 disabled={isCreatingCollection}
               />
             </div>
           </div>
           <DialogFooter>
             <Button variant="outline" onClick={() => setOpenDialog(false)} disabled={isCreatingCollection}>Cancel</Button>
             <Button type="button" onClick={handleCreateCollection} disabled={isCreatingCollection || !newCollectionName.trim() || !/^[A-Z]/.test(newCollectionName.trim())}>
               {isCreatingCollection ? "Creating..." : "Create Collection"}
             </Button>
           </DialogFooter>
         </DialogContent>
       </Dialog>

    </div>
  );
} 