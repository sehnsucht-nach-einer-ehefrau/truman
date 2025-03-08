"use client";

import { useState } from "react";
import TimerCircle from "./timer-circle"; // Your existing timer component
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";
import IntervalTimerPopup from "./interval-timer-popup";
import WorkTimerPopup from "./work-timer-popup";

export function TimerSystem() {
  const [isRunning, setIsRunning] = useState(false);
  const [resetKey, setResetKey] = useState(0);

  // Popup states
  const [showIntervalPopup, setShowIntervalPopup] = useState(false);
  const [showWorkPopup, setShowWorkPopup] = useState(false);
  const [pendingWorkPopup, setPendingWorkPopup] = useState(false);

  // Timer completion handlers
  const handleIntervalComplete = () => {
    setIsRunning(false);
    setShowIntervalPopup(true);

    // If work timer also completed, set it as pending
    if (isWorkTimerComplete()) {
      setPendingWorkPopup(true);
    }
  };

  const handleWorkComplete = () => {
    setIsRunning(false);

    // Only show work popup immediately if interval popup is not showing
    if (!showIntervalPopup) {
      setShowWorkPopup(true);
    } else {
      setPendingWorkPopup(true);
    }
  };

  // Check if work timer is complete (placeholder - implement based on your timer logic)
  const isWorkTimerComplete = () => {
    const workDuration = Number.parseInt(
      localStorage.getItem("workDuration") || "0",
    );
    return workDuration <= 0;
  };

  // Handle interval popup close
  const handleIntervalPopupClose = () => {
    setShowIntervalPopup(false);
    setIsRunning(true); // Resume timer after popup close
    setPendingWorkPopup(true);

    // Show work popup if it's pending
    if (pendingWorkPopup) {
      setShowWorkPopup(true);
      setPendingWorkPopup(false);
    }
  };

  // Handle work popup close
  const handleWorkPopupClose = () => {
    setShowWorkPopup(false);
  };

  const handleReset = () => {
    // Stop the timer if it's running
    if (isRunning) {
      setIsRunning(false);
    }

    // Reset popup states
    setShowIntervalPopup(false);
    setShowWorkPopup(false);
    setPendingWorkPopup(false);

    // Increment reset key to trigger reset in child components
    setResetKey((prev) => prev + 1);
  };

  return (
    <div className="flex flex-col items-center gap-8">
      {/* Start/Pause Button */}
      <div className="flex flex-wrap gap-8 justify-center">
        {/* Work Duration Timer */}
        <TimerCircle
          key={`work-${resetKey}`}
          localStorageTitle="workDuration"
          multiplier={60 * 60}
          isRunning={isRunning}
          onToggle={() => setIsRunning(!isRunning)}
          onComplete={handleWorkComplete}
        />

        {/* Interval Duration Timer */}
        <TimerCircle
          key={`interval-${resetKey}`}
          localStorageTitle="intervalDuration"
          multiplier={60}
          isRunning={isRunning}
          onToggle={() => setIsRunning(!isRunning)}
          onComplete={handleIntervalComplete}
        />
      </div>

      <div className="flex gap-4">
        <Button
          onClick={() => setIsRunning(!isRunning)}
          variant="default"
          size="lg"
          className="font-normal"
        >
          {isRunning ? (
            <>
              <Pause className="mr-2 h-4 w-4" /> Stop
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" /> Start
            </>
          )}
        </Button>

        <Button
          onClick={handleReset}
          variant="outline"
          size="lg"
          className="font-normal"
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Reset
        </Button>
      </div>

      {/* Popups */}
      <IntervalTimerPopup
        isOpen={showIntervalPopup}
        onClose={handleIntervalPopupClose}
      />

      <WorkTimerPopup isOpen={showWorkPopup} onClose={handleWorkPopupClose} />
    </div>
  );
}
