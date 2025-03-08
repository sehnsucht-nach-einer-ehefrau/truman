import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key } from "lucide-react";
import { useState } from "react";

export default function GroqApiKey() {
  const [apiKey, setApiKey] = useState("");
  const [hasApiKey, setHasApiKey] = useState(true);
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [showApiKeyInputDialog, setShowApiKeyInputDialog] = useState(false);

  const checkGroqExists = () => {
    return localStorage.getItem("groqApiKey") !== null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("groqApiKey", apiKey);
    setHasApiKey(true);
    setShowApiKeyInputDialog(false);
  };

  return (
    <div>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => {
          if (hasApiKey && checkGroqExists()) {
            setShowConfirmationDialog(true);
          } else {
            setShowApiKeyInputDialog(true);
          }
        }}
      >
        <Key className="h-5 w-5" />
      </Button>

      <AlertDialog open={showConfirmationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change API Key</AlertDialogTitle>
            <AlertDialogDescription>
              You already have a Groq API key. Would you like to change it?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <div className="flex justify-between gap-4 w-full">
              <AlertDialogCancel
                onClick={() => setShowConfirmationDialog(false)}
              >
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setShowConfirmationDialog(false);
                  setShowApiKeyInputDialog(true);
                }}
              >
                Continue
              </AlertDialogAction>
            </div>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* API Key Input Dialog */}
      <AlertDialog open={showApiKeyInputDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Set your Groq API key</AlertDialogTitle>
            <form onSubmit={handleSubmit} className="mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="password"
                    placeholder="Enter your API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                  <p className="text-sm text-muted-foreground">
                    Don&apos;t have a Groq API key? Get one for free{" "}
                    <a
                      href="https://console.groq.com/keys"
                      target="_blank"
                      className="font-medium text-primary underline"
                    >
                      here
                    </a>
                  </p>
                </div>
                <div className="flex justify-between gap-4">
                  <AlertDialogCancel
                    onClick={() => setShowApiKeyInputDialog(false)}
                    asChild
                  >
                    <Button variant="ghost">Cancel</Button>
                  </AlertDialogCancel>
                  <Button type="submit">Save</Button>
                </div>
              </div>
            </form>
          </AlertDialogHeader>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
