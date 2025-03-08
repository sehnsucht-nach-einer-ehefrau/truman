"use client";

import Navbar from "./navbar";
import BottomBar from "./bottom-bar";
import { TimerSystem } from "./timer/timer-system";

export default function Timer() {
  return (
    <div className="flex flex-col h-screen justify-center">
      <Navbar />
      <TimerSystem />
      <BottomBar />
    </div>
  );
}
