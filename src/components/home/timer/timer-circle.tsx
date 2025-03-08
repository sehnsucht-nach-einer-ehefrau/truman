"use client";

import { useEffect, useState, useRef } from "react";

export default function TimerCircle({
  localStorageTitle,
  multiplier,
  isRunning,
  onToggle,
  onComplete,
}: {
  localStorageTitle: string;
  multiplier: number;
  isRunning: boolean;
  onToggle: () => void;
  onComplete?: () => void;
}) {
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [savedDuration, setSavedDuration] = useState(60);
  const savedDurationRef = useRef(savedDuration);

  useEffect(() => {
    if (isRunning && timeRemaining <= 0) {
      // Call onComplete if provided and timer reaches zero
      if (onComplete) {
        onComplete();
      } else {
        onToggle();
      }
    } else if (timeRemaining <= 0 && localStorageTitle == "intervalDuration") {
      setTotalTime(savedDuration);
      setTimeRemaining(savedDuration);
    }
  }, [timeRemaining, isRunning, onToggle, onComplete]);

  // Keep ref updated
  useEffect(() => {
    savedDurationRef.current = savedDuration;
  }, [savedDuration]);

  // LocalStorage initialization
  useEffect(() => {
    const saved = localStorage.getItem(localStorageTitle);
    const initialDuration = saved ? parseInt(saved, 10) * multiplier : 60;
    setSavedDuration(initialDuration);
  }, []);

  // LocalStorage sync
  useEffect(() => {
    const checkLocalStorage = () => {
      const saved = localStorage.getItem(localStorageTitle);
      const newDuration = saved ? parseInt(saved, 10) * multiplier : 60;
      if (newDuration !== savedDurationRef.current) {
        setSavedDuration(newDuration);
      }
    };

    const interval = setInterval(checkLocalStorage, 1000);
    const handleStorage = (e: StorageEvent) => {
      if (e.key === localStorageTitle) checkLocalStorage();
    };

    window.addEventListener("storage", handleStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  // Timer reset when duration changes
  useEffect(() => {
    setTotalTime(savedDuration);
    setTimeRemaining(savedDuration);
  }, [savedDuration]);

  // Timer logic
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isRunning && timeRemaining > 0) {
      interval = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 0.1) {
            clearInterval(interval!);
            return 0;
          }
          return prev - 0.1;
        });
      }, 100);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, timeRemaining]);

  // Formatting function
  const formatTime = (seconds: number) => {
    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const remainingSeconds = totalSeconds % 3600;
    const mins = Math.floor(remainingSeconds / 60);
    const secs = remainingSeconds % 60;

    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    }
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Circle calculations
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const progress = totalTime > 0 ? (timeRemaining / totalTime) * 100 : 0;
  const strokeDashoffset = circumference * (1 + progress / 100);

  return (
    <div className="flex-1 flex items-center justify-center my-4">
      <div className="relative">
        <svg width="200" height="200">
          {/* Background circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke="var(--border)"
            strokeWidth="3"
          />
          {/* Progress circle */}
          <circle
            cx="100"
            cy="100"
            r={radius}
            fill="transparent"
            stroke="var(--foreground)"
            strokeWidth="3"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{
              transformOrigin: "center",
              transform: "rotate(-90deg)",
              transition: "stroke-dashoffset 0.1s linear",
            }}
          />
        </svg>

        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
          <div className="text-xl mb-2 font-medium">
            {localStorageTitle === "workDuration"
              ? "Work Timer"
              : "Interval Timer"}
          </div>
          <div className="text-2xl mb-4">{formatTime(timeRemaining)}</div>
        </div>
      </div>
    </div>
  );
}
