"use client";
import DarkMode from "./bottombar/darkmode";
import GroqAPIKey from "./bottombar/groq-api-key";
import Profile from "./bottombar/profile";
import SearchButton from "./bottombar/search";
import SettingsButton from "./bottombar/settings";
import TimeZoneButton from "./bottombar/timezone-button";

export default function BottomBar() {
  return (
    <div className="mt-12 flex mx-auto flex-col">
      <div className="mx-12">
        <SearchButton />
      </div>
      <div className="flex mx-auto mt-4">
        <DarkMode />
        <SettingsButton />
        <GroqAPIKey />
        <TimeZoneButton />
        <Profile />
      </div>
    </div>
  );
}
