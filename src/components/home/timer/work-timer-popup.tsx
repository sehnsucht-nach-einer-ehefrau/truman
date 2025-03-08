"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileText, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { callGroqAPI } from "@/lib/groq";
import { formatData } from "@/lib/formatData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  ReportDatabase,
  DailyReport,
  ReportData,
  PieChartData,
  QuickReportData,
  DetailedReportData,
  Activity,
} from "@/lib/report-db";

import { appDataDir, join } from "@tauri-apps/api/path";
import { convertFileSrc } from "@tauri-apps/api/tauri";

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

// Create notification sound function for work timer
function createWorkTimerSound(audioContext: AudioContext) {
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

  // Function to create a bell-like oscillator
  function createBellOscillator(frequency = 587.33, type = "sine") {
    const osc = audioContext.createOscillator();
    osc.type = type as OscillatorType;
    osc.frequency.setValueAtTime(frequency, audioContext.currentTime);
    return osc;
  }

  // First chime - starting with a slightly higher note (D)
  function playFirstChime() {
    const osc = createBellOscillator(587.33); // D5
    const gainNode = audioContext.createGain();

    // Add subtle frequency modulation
    osc.frequency.linearRampToValueAtTime(580, audioContext.currentTime + 0.3);

    // Connect nodes
    osc.connect(gainNode);
    gainNode.connect(masterGain);

    // Create smooth envelope with slightly longer release
    const releaseEnvelope = createEnvelope(gainNode, 0.01, 0.3, 0.4);

    // Play sound
    osc.start();
    setTimeout(() => {
      releaseEnvelope(0.3);
      setTimeout(() => osc.stop(), 350);
    }, 180);
  }

  // Second chime - moving to a complementary note (G)
  function playSecondChime() {
    const osc = createBellOscillator(784); // G5
    const gainNode = audioContext.createGain();

    // Add subtle frequency modulation
    osc.frequency.linearRampToValueAtTime(775, audioContext.currentTime + 0.2);

    // Connect nodes
    osc.connect(gainNode);
    gainNode.connect(masterGain);

    // Create smooth envelope
    const releaseEnvelope = createEnvelope(gainNode, 0.005, 0.35, 0.35);

    // Play sound
    osc.start();
    setTimeout(() => {
      releaseEnvelope(0.2);
      setTimeout(() => osc.stop(), 350);
    }, 170);
  }

  // Third gentle chime for a final resolution (B)
  function playThirdChime() {
    const osc = createBellOscillator(987.77); // B5
    const gainNode = audioContext.createGain();

    // Add subtle frequency modulation
    osc.frequency.linearRampToValueAtTime(980, audioContext.currentTime + 0.2);

    // Connect nodes
    osc.connect(gainNode);
    gainNode.connect(masterGain);

    // Create smooth envelope with quicker attack and longer release
    const releaseEnvelope = createEnvelope(gainNode, 0.005, 0.4, 0.3);

    // Play sound
    osc.start();
    setTimeout(() => {
      releaseEnvelope(0.2);
      setTimeout(() => osc.stop(), 400);
    }, 150);
  }

  // Schedule the chimes in sequence
  playFirstChime();
  setTimeout(playSecondChime, 150);
  setTimeout(playThirdChime, 300);
}

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

export default function WorkTimerPopup({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [workDuration, setWorkDuration] = useState(60);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportExists, setReportExists] = useState(false);
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const [showTimeZoneDialog, setShowTimeZoneDialog] = useState(false);
  const [selectedTimeZone, setSelectedTimeZone] = useState("");
  const [timeZones, setTimeZones] = useState<string[]>([]);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);

  const [os, setOs] = useState<string | null>(null);

  const router = useRouter();

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

  useEffect(() => {
    // Initialize AudioContext
    if (typeof window !== "undefined") {
      const AudioContextClass =
        window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        setAudioContext(new AudioContextClass());
      }
    }

    // Load stored work duration
    const storedDuration = localStorage.getItem("workDuration");
    if (storedDuration) {
      setWorkDuration(Number(storedDuration));
    }

    // Load stored time zone or detect if not set
    const storedTimeZone = localStorage.getItem("userTimeZone");
    if (storedTimeZone) {
      setSelectedTimeZone(storedTimeZone);
    } else {
      setSelectedTimeZone("America/Los_Angeles");
      localStorage.setItem("userTimeZone", "America/Los_Angeles");
    }

    // Generate list of time zones for selection dialog
    const zones = getTimeZones();
    setTimeZones(zones);

    // Check if a report already exists for today
    checkExistingReport();

    return () => {
      // Cleanup audio context when component unmounts
      if (audioContext) {
        audioContext.close();
      }
    };
  }, []); // Runs only on mount (client-side only)

  // Play notification sound when dialog opens
  useEffect(() => {
    if (isOpen && audioContext) {
      sendNotification();
      playAlertSound();
    }
  }, [isOpen, audioContext]); // Added audioContext dependency

  // Send notification based on platform
  const sendNotification = async () => {
    const title = "Work Session Complete";
    const body = `You've completed a ${workDuration} hour work session.`;
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
        // Use our custom sound function
        createWorkTimerSound(audioContext);
      } else {
        // Fallback using Audio element
        const audio = new Audio("/sounds/work-timer-alarm.mp3");
        audio.volume = 0.5;
        await audio.play().catch((err) => {
          console.warn("Failed to play audio:", err);
        });
      }
    } catch (error) {
      console.error("Error playing sound:", error);
    }
  };

  // Get user's current date based on their time zone
  const getUserDate = () => {
    const now = new Date();
    if (!selectedTimeZone) return now.toISOString().split("T")[0]; // Default to local if not set

    // Check if we need to increment the date
    // Get the date string using the user's time zone
    const dateStr = now.toLocaleDateString("en-US", {
      timeZone: selectedTimeZone,
    });
    const timeStr = now.toLocaleTimeString("en-US", {
      timeZone: selectedTimeZone,
    });

    // If it's past midnight but before the cutoff time (e.g., 4 AM), still use yesterday's date
    const hourMinute = timeStr.split(" ")[0].split(":");
    const hour = parseInt(hourMinute[0]);
    const isAM = timeStr.includes("AM");

    // Parse the date
    const parts = dateStr.split("/");
    const year = parts[2];
    const month = parts[0].padStart(2, "0");
    const day = parts[1].padStart(2, "0");

    // Get yesterday's date if necessary (for late night work sessions)
    if (isAM && hour === 12) {
      // 12:00 AM exactly
      // Get yesterday's date
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toLocaleDateString("en-US", {
        timeZone: selectedTimeZone,
      });
      const yesterdayParts = yesterdayStr.split("/");

      // Store today's date for the timer to use when incrementing
      const todayFormatted = `${year}-${month}-${day}`;
      localStorage.setItem("nextReportDate", todayFormatted);

      // Return yesterday's date in YYYY-MM-DD format
      return `${yesterdayParts[2]}-${yesterdayParts[0].padStart(2, "0")}-${yesterdayParts[1].padStart(2, "0")}`;
    }

    // Store the current date for the report
    return `${year}-${month}-${day}`;
  };

  const checkExistingReport = async () => {
    try {
      // Get user's date based on time zone
      const dateString = getUserDate();

      // Get the report database instance
      const reportDB = ReportDatabase.getInstance();
      await reportDB.initialize();

      // Check if a report for today already exists
      const existingReport = await reportDB.getDailyReport(dateString);

      if (existingReport) {
        setReportExists(true);
      }
    } catch (error) {
      console.error("Error checking for existing report:", error);
    }
  };

  const handleViewExistingReport = () => {
    router.push("/reports?type=daily&id=" + getUserDate());
    onClose();
  };

  const handleTimeZoneChange = (value: string) => {
    setSelectedTimeZone(value);
    localStorage.setItem("userTimeZone", value);
    setShowTimeZoneDialog(false);
    checkExistingReport(); // Re-check with new time zone
  };

  const handleOpenTimeZoneDialog = () => {
    setShowTimeZoneDialog(true);
  };

  const handleGenerateReport = async (overwrite = false) => {
    try {
      setIsGenerating(true);

      // Get user's date based on time zone
      const dateString = getUserDate();
      const year = dateString.substring(0, 4);

      // Get the report database instance
      const reportDB = ReportDatabase.getInstance();
      await reportDB.initialize();

      // Check if a report for today already exists (if not already in overwrite mode)
      if (!overwrite && !confirmOverwrite) {
        const existingReport = await reportDB.getDailyReport(dateString);

        if (existingReport) {
          setReportExists(true);
          setIsGenerating(false);
          return;
        }
      }

      // Generate the report
      const apiKey = localStorage.getItem("groqApiKey");

      if (!apiKey) {
        toast("No API key found. Please set your Groq API key in settings.");
        setIsGenerating(false);
        return;
      }
      const data = JSON.parse(
        localStorage.getItem("intervalActivities") || "[]",
      );
      if (data.length === 0) {
        toast("No activities to report. Please add some activities.");
        setIsGenerating(false);
        return;
      }

      const activities = formatData(data);

      const query: Message[] = [
        {
          role: "system",
          content:
            "I will provide you with a list of activities. Your task is to categorize them into broad, high-level categories based on their general theme. The categories should be vague but meaningful, such as 'Studying,' 'Work,' 'Social,' 'Entertainment,' 'Exercise,' etc. If an activity could fit into multiple categories, choose the most relevant one. If an activity does not clearly fit into any category or does not seem like a task, place it under the 'Miscellaneous' category. Format your output as follows: Category Name\nActivity 1\nActivity 2\nActivity 3\n\nCategory Name 2\nActivity 4...\netcetera. There should be two new lines between each different category, but do not include any new lines at the beginning or end of your response.",
        },
        { role: "user", content: activities },
      ];

      const result = await callGroqAPI(apiKey, query);
      const processedData =
        result
          ?.split("\n\n") // Use optional chaining
          ?.map((block) => {
            const [category, ...activities] = block
              .split("\n")
              .map((line) => line.trim());
            return { category, activities };
          })
          ?.slice(1) ?? []; // Fallback to empty array if `result` is null

      // Generate report data structure
      const reportData = generateReportData(processedData);

      // Create daily report
      const dailyReport: DailyReport = {
        id: dateString,
        date: dateString,
        title: `Daily Report ${dateString}`,
        data: reportData,
      };

      // Save the daily report (will overwrite if exists due to same ID)
      if (overwrite) {
        await reportDB.updateDailyReport(dailyReport);
      } else {
        await reportDB.addDailyReport(dailyReport);
      }

      // Check if this is the 365th report
      const reportCount = await reportDB.getDailyReportCount();

      if (reportCount >= 365) {
        // Time to generate a yearly report
        const yearlyReport = await reportDB.generateYearlyReport(year);

        // Save the yearly report
        await reportDB.addYearlyReport(yearlyReport);

        // Clear all daily reports
        const dailyStorePromise = reportDB.db.clear(
          ReportDatabase.DAILY_REPORTS_STORE,
        );
        await dailyStorePromise;
      }

      // Check if the next report date should be tomorrow (12:00 AM condition)
      const nextReportDate = localStorage.getItem("nextReportDate");
      if (nextReportDate) {
        // Use the stored next date for the next report
        localStorage.removeItem("nextReportDate"); // Clear it after use
        localStorage.removeItem("intervalActivities"); // Clear activities
      }

      // Navigate to reports page
      router.push("/reports?type=daily&id=" + getUserDate());
    } catch (error) {
      console.error("Error generating report:", error);
      router.push("/reports?type=daily&id=" + getUserDate());
    } finally {
      setIsGenerating(false);
      setConfirmOverwrite(false);
    }
  };

  // Get available time zones
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

  // Time Zone dialog content
  if (showTimeZoneDialog) {
    return (
      <Dialog
        open={true}
        onOpenChange={(open) => !open && setShowTimeZoneDialog(false)}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-normal">
              Select Your Time Zone
            </DialogTitle>
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
              {new Date().toLocaleTimeString("en-US", {
                timeZone: selectedTimeZone,
              })}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              Current date in selected zone:{" "}
              {new Date().toLocaleDateString("en-US", {
                timeZone: selectedTimeZone,
              })}
            </p>
          </div>

          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={() => setShowTimeZoneDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                localStorage.setItem("userTimeZone", selectedTimeZone);
                setShowTimeZoneDialog(false);
                checkExistingReport();
              }}
            >
              Save Time Zone
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Render overwrite confirmation dialog
  if (reportExists && !confirmOverwrite) {
    return (
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-normal">
              Report for today&apos;s date already exists. Overwrite?
            </DialogTitle>
            <DialogDescription>
              Overwriting the report will permanently delete the existing
              report, but you can always export it before proceeding.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-between">
            <Button
              variant="outline"
              onClick={handleViewExistingReport}
              disabled={isGenerating}
            >
              Go to existing report
            </Button>
            <Button
              onClick={() => {
                setConfirmOverwrite(true);
                handleGenerateReport(true);
              }}
              disabled={isGenerating}
            >
              <FileText className="mr-2 h-4 w-4" />
              {isGenerating ? "Overwriting..." : "Overwrite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Render standard dialog
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-normal">
            Work Session Complete
          </DialogTitle>
          <DialogDescription className="font-normal">
            You&apos;ve completed a {workDuration} hour(s) work session. Would
            you like to generate a report?
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between px-1 py-2">
          <div className="text-sm text-gray-500">
            Current time zone: {selectedTimeZone}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleOpenTimeZoneDialog}
            className="h-8"
          >
            <Clock className="mr-2 h-4 w-4" />
            Change
          </Button>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={isGenerating}>
            Skip
          </Button>
          <Button
            onClick={() => handleGenerateReport(false)}
            disabled={isGenerating}
          >
            <FileText className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Generate Report"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const generateReportData = (
  processedData: { category: string; activities: string[] }[],
): ReportData => {
  const pieChart: PieChartData[] = [];
  const quickReport: QuickReportData[] = [];
  const detailedReport: DetailedReportData[] = [];

  let totalActivities = 0;

  // Process each category
  processedData.forEach((categoryData) => {
    const { category, activities } = categoryData;
    const activityCount = activities.length;
    totalActivities += activityCount;

    // Add to pie chart data
    pieChart.push({
      name: category,
      value: activityCount,
    });

    // Build detailed activities
    const detailedActivities: Activity[] = [];

    // Count occurrences of each activity
    const activityCounts = new Map<string, number>();
    activities.forEach((activity) => {
      const count = (activityCounts.get(activity) || 0) + 1;
      activityCounts.set(activity, count);
    });

    // Convert to Activity[] format
    activityCounts.forEach((count, activity) => {
      detailedActivities.push({ activity, count });
    });

    // Sort by count descending
    detailedActivities.sort((a, b) => b.count - a.count);

    // Add to detailed report
    detailedReport.push({
      category,
      activities: detailedActivities,
    });
  });

  // Calculate percentages for quick report
  pieChart.forEach((item) => {
    quickReport.push({
      category: item.name,
      percent: (item.value / totalActivities) * 100,
    });
  });

  return {
    pieChart,
    quickReport,
    detailedReport,
  };
};
