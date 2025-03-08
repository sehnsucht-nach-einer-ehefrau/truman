"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Clock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function TimeZoneButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTimeZone, setSelectedTimeZone] = useState("");
  const [timeZones, setTimeZones] = useState<string[]>([]);

  useEffect(() => {
    // Load stored time zone or detect if not set
    const storedTimeZone = localStorage.getItem("userTimeZone");
    if (storedTimeZone) {
      setSelectedTimeZone(storedTimeZone);
    } else {
      setSelectedTimeZone("America/Los_Angeles");
      localStorage.setItem("userTimeZone", "America/Los_Angeles");
    }

    // Generate list of time zones
    setTimeZones(getTimeZones());
  }, []);

  const getTimeZones = () => {
    // This is a subset of common time zones for the UI
    return [
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Anchorage",
      "America/Honolulu",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Asia/Tokyo",
      "Asia/Shanghai",
      "Asia/Singapore",
      "Australia/Sydney",
      "Pacific/Auckland",
    ];
  };

  const handleTimeZoneChange = (value: string) => {
    setSelectedTimeZone(value);
    localStorage.setItem("userTimeZone", value);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="mx-1"
        onClick={() => setIsOpen(true)}
      >
        <Clock className="h-5 w-5" />
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Time Zone Settings</DialogTitle>
            <DialogDescription>
              Choose your time zone to ensure reports are created with the
              correct date.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Select
              value={selectedTimeZone}
              onValueChange={handleTimeZoneChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select time zone" />
              </SelectTrigger>
              <SelectContent>
                {timeZones.map((zone) => (
                  <SelectItem key={zone} value={zone}>
                    {zone}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <p className="mt-2 text-sm text-gray-500">
              Current time in selected zone:{" "}
              {selectedTimeZone &&
              Intl.DateTimeFormat().resolvedOptions().timeZone ===
                selectedTimeZone
                ? new Date().toLocaleTimeString("en-US", {
                    timeZone: selectedTimeZone,
                  })
                : "Invalid Time Zone"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Current date in selected zone:{" "}
              {selectedTimeZone &&
              Intl.DateTimeFormat().resolvedOptions().timeZone ===
                selectedTimeZone
                ? new Date().toLocaleDateString("en-US", {
                    timeZone: selectedTimeZone,
                  })
                : "Invalid Time Zone"}
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setIsOpen(false)}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
