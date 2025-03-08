"use client";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [workDuration, setWorkDuration] = useState("8");
  const [intervalDuration, setIntervalDuration] = useState("15");

  // Load saved settings from localStorage on component mount
  useEffect(() => {
    const savedWorkDuration = localStorage.getItem("workDuration");
    const savedIntervalDuration = localStorage.getItem("intervalDuration");

    if (savedWorkDuration) setWorkDuration(savedWorkDuration);
    if (savedIntervalDuration) setIntervalDuration(savedIntervalDuration);
  }, []);

  const handleSave = () => {
    // Validate inputs are numbers
    if (!/^\d+$/.test(workDuration) || !/^\d+$/.test(intervalDuration)) {
      toast("Please enter a valid number for both fields.");
      return;
    }

    // Save to localStorage
    localStorage.setItem("workDuration", workDuration);
    localStorage.setItem("intervalDuration", intervalDuration);

    toast("Settings saved! Your tracking settings have been updated.");

    setOpen(false);
  };

  return (
    <div>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="icon">
            <Settings className="h-5 w-5" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tracking Settings</AlertDialogTitle>
            <AlertDialogDescription>
              Configure your work session and tracking interval durations.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="workDuration" className="col-span-2">
                Work session duration (hours)
              </Label>
              <Input
                id="workDuration"
                value={workDuration}
                onChange={(e) => setWorkDuration(e.target.value)}
                className="col-span-2"
                placeholder="8"
              />
            </div>

            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="intervalDuration" className="col-span-2">
                Tracking interval (minutes)
              </Label>
              <Input
                id="intervalDuration"
                value={intervalDuration}
                onChange={(e) => setIntervalDuration(e.target.value)}
                className="col-span-2"
                placeholder="15"
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleSave}>Save</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
