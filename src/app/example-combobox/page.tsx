"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Combobox } from "@/components/ui/combobox";
import { Label } from "@/components/ui/label";
import { PlusCircle } from "lucide-react";
import { useState } from "react";

export default function ExampleComboboxPage() {
  const [value, setValue] = useState("");
  const [fruits, setFruits] = useState([
    { value: "apple", label: "Apple" },
    { value: "banana", label: "Banana" },
    { value: "orange", label: "Orange" },
    { value: "strawberry", label: "Strawberry" },
  ]);

  const addNewFruit = () => {
    // In a real app, you might show a dialog here
    const newFruit = prompt("Enter a new fruit name:");
    if (newFruit?.trim()) {
      const newValue = newFruit.toLowerCase().replace(/\s+/g, "-");
      setFruits([...fruits, { value: newValue, label: newFruit }]);
      setValue(newValue);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <Card className="max-w-lg mx-auto">
        <CardHeader>
          <CardTitle>Combobox with Actions Example</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="basic-combobox">Basic Combobox</Label>
            <Combobox
              options={fruits}
              value={value}
              onValueChange={setValue}
              placeholder="Select a fruit..."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="combobox-with-actions">Combobox with Add Action</Label>
            <Combobox
              options={fruits}
              value={value}
              onValueChange={setValue}
              placeholder="Select a fruit..."
              actions={
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start font-normal"
                  onClick={addNewFruit}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add new fruit...
                </Button>
              }
            />
          </div>

          <div className="mt-6 p-4 bg-muted rounded-md">
            <p className="text-sm font-medium">Selected value: {value || "None"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {value
                ? `You selected: ${fruits.find((f) => f.value === value)?.label}`
                : "Select a fruit from the dropdown"}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
