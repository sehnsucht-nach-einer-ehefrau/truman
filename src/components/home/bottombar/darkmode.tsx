"use client";

import { useTheme } from "next-themes";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Moon, Sun } from "lucide-react";

export default function DarkMode() {
  const [theme, themeSetter] = useState(false);

  const { setTheme } = useTheme();

  const themeSet = () => {
    themeSetter(!theme);
    if (theme) {
      setTheme("light");
    } else {
      setTheme("dark");
    }
  };
  return (
    <Button variant="ghost" size="icon" onClick={() => themeSet()}>
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
