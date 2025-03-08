"use client";
import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Import Tauri-specific APIs with error handling for web environments
let tauriNotification: any;
let tauriOs: any;
let tauriPath: any;

// Only import Tauri modules in a client environment and when Tauri is available
if (typeof window !== "undefined") {
  try {
    // Dynamic imports for Tauri modules
    const loadTauriModules = async () => {
      try {
        const notificationModule = await import("@tauri-apps/api/notification");
        const osModule = await import("@tauri-apps/api/os");
        const pathModule = await import("@tauri-apps/api/path");
        tauriNotification = notificationModule;
        tauriOs = osModule;
        tauriPath = pathModule;
      } catch (error) {
        console.warn("Tauri APIs not available:", error);
      }
    };
    loadTauriModules();
  } catch (error) {
    console.warn("Failed to load Tauri modules:", error);
  }
}

// Create notification sound function moved outside component
function createNotificationSound(audioContext: AudioContext) {
  // Master gain node for overall volume control
  const masterGain = audioContext.createGain();
  masterGain.gain.setValueAtTime(0.3, audioContext.currentTime);
  masterGain.connect(audioContext.destination);

  // Create a gentle attack and release for the sound (prevents clicking/popping)
  function createEnvelope(
    gainNode: any,
    attackTime = 0.01,
    releaseTime = 0.1,
    peakValue = 1,
  ) {
    const now = audioContext.currentTime;
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(peakValue, now + attackTime);
    gainNode.gain.setValueAtTime(peakValue, now + attackTime);
    return function release(duration: number) {
      const releaseStart = audioContext.currentTime;
      gainNode.gain.setValueAtTime(gainNode.gain.value, releaseStart);
      gainNode.gain.linearRampToValueAtTime(0, releaseStart + releaseTime);
    };
  }

  // First soft chime
  function playFirstChime() {
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Create a more bell-like sound with slight harmonics
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, audioContext.currentTime); // A5 note

    // Add subtle frequency modulation for more character
    osc.frequency.linearRampToValueAtTime(860, audioContext.currentTime + 0.3);

    // Connect nodes
    osc.connect(gainNode);
    gainNode.connect(masterGain);

    // Create smooth envelope
    const releaseEnvelope = createEnvelope(gainNode, 0.01, 0.25, 0.5);

    // Play sound
    osc.start();
    setTimeout(() => {
      releaseEnvelope(0.3);
      setTimeout(() => osc.stop(), 300);
    }, 200);
  }

  // Second complementary chime
  function playSecondChime() {
    const osc = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    // Higher note for pleasant resolution
    osc.type = "sine";
    osc.frequency.setValueAtTime(1318.5, audioContext.currentTime); // E6 note - musical 5th

    // Add subtle frequency modulation
    osc.frequency.linearRampToValueAtTime(1300, audioContext.currentTime + 0.2);

    // Connect nodes
    osc.connect(gainNode);
    gainNode.connect(masterGain);

    // Create smooth envelope
    const releaseEnvelope = createEnvelope(gainNode, 0.005, 0.3, 0.4);

    // Play sound
    osc.start();
    setTimeout(() => {
      releaseEnvelope(0.2);
      setTimeout(() => osc.stop(), 300);
    }, 150);
  }

  // Schedule the chimes
  playFirstChime();
  setTimeout(playSecondChime, 180);
}

export default function IntervalTimerPopup({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [activity, setActivity] = useState("");
  const [intervalDuration, setIntervalDuration] = useState(15);
  const [os, setOs] = useState<string | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  const [validationAttempted, setValidationAttempted] = useState(false);
  const isInputEmpty = activity.trim() === "";

  const handleSubmitWithValidation = () => {
    setValidationAttempted(true);

    if (!isInputEmpty) {
      handleSubmit();
    }
  };

  // Initialize AudioContext
  useEffect(() => {
    if (typeof window !== "undefined") {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        setAudioContext(new AudioContextClass());
      }
    }
    return () => {
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []);

  // Detect OS using Tauri API
  useEffect(() => {
    const detectOs = async () => {
      try {
        if (tauriOs) {
          const type = await tauriOs.type();
          setOs(type);
          console.log("Detected OS:", type);
        } else {
          // Fallback browser detection
          const userAgent = navigator.userAgent.toLowerCase();
          if (userAgent.indexOf("win") !== -1) setOs("Windows");
          else if (userAgent.indexOf("mac") !== -1) setOs("macOS");
          else if (userAgent.indexOf("linux") !== -1) setOs("Linux");
          else setOs("Unknown");
        }
      } catch (error) {
        console.error("Error detecting OS:", error);
        setOs("Unknown");
      }
    };
    detectOs();
  }, []);

  // Load saved interval duration
  useEffect(() => {
    const storedInterval = localStorage.getItem("intervalDuration");
    if (storedInterval) {
      setIntervalDuration(Number(storedInterval));
    }
  }, []);

  // Show notification when popup opens
  useEffect(() => {
    if (isOpen && audioContext) {
      sendNotification();
      playAlertSound();
    }
  }, [isOpen, audioContext]); // Added audioContext dependency

  // Send notification based on platform
  const sendNotification = async () => {
    const title = "Interval Complete";
    const body = `Time to log what you accomplished in the last ${intervalDuration} minute(s)!`;
    try {
      // Try Tauri notification first (for desktop app)
      if (tauriNotification) {
        await tauriNotification.sendNotification({
          title,
          body,
          icon: "/icon/truman.png",
        });
      }
      // Fallback to Web Notifications API
      else if ("Notification" in window) {
        if (Notification.permission === "granted") {
          new Notification(title, { body, icon: "/icon/truman.png" });
        } else if (Notification.permission !== "denied") {
          const permission = await Notification.requestPermission();
          if (permission === "granted") {
            new Notification(title, { body, icon: "/icon/truman.png" });
          }
        }
      }
    } catch (error) {
      console.error("Failed to send notification:", error);
    }
  };

  // Play alert sound
  const playAlertSound = async () => {
    try {
      if (audioContext) {
        // Use our sound function defined outside the component
        createNotificationSound(audioContext);
      } else {
        // Fallback using Audio element
        const audio = new Audio("/sounds/timer-alarm.mp3");
        audio.volume = 0.5;
        await audio.play().catch((err) => {
          console.warn("Failed to play audio:", err);
        });
      }
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  const handleSubmit = () => {
    if (activity.trim()) {
      // Store the activity in localStorage with timestamp
      const intervalActivities = JSON.parse(
        localStorage.getItem("intervalActivities") || "[]",
      );
      intervalActivities.push({
        activity: activity.trim(),
        timestamp: new Date().toISOString(),
        os: os,
      });
      localStorage.setItem(
        "intervalActivities",
        JSON.stringify(intervalActivities),
      );
      console.log("Interval activity saved:", activity);
      setActivity("");
      onClose();
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Interval Complete</AlertDialogTitle>
          <AlertDialogDescription>
            What did you accomplish during the last {intervalDuration}{" "}
            minute(s)?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="activity">Activity</Label>
            <Input
              id="activity"
              placeholder="Describe what you did..."
              value={activity}
              onChange={(e) => {
                setActivity(e.target.value);
                if (validationAttempted && e.target.value.trim() !== "") {
                  setValidationAttempted(false);
                }
              }}
              autoFocus
              onKeyDown={(e) =>
                e.key === "Enter" && handleSubmitWithValidation()
              }
              className={
                validationAttempted && isInputEmpty
                  ? "border-red-500 focus-visible:ring-red-500"
                  : ""
              }
            />
            {validationAttempted && isInputEmpty && (
              <p className="text-sm text-red-500 mt-1">
                Please enter an activity
              </p>
            )}
          </div>
          {os && (
            <div className="text-xs text-muted-foreground">
              Detected OS: {os}
            </div>
          )}
        </div>
        <AlertDialogFooter>
          <AlertDialogAction
            onClick={handleSubmitWithValidation}
            disabled={isInputEmpty && validationAttempted}
          >
            Save
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
