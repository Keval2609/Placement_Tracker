import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../lib/theme";

export const ThemeToggle: React.FC<{ className?: string }> = ({ className = "" }) => {
  const { resolvedTheme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
      className={`inline-flex items-center justify-center w-9 h-9 rounded-md border transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bmw-primary ${
        resolvedTheme === "dark"
          ? "bg-neutral-800 border-neutral-700 text-amber-400 hover:bg-neutral-700 hover:text-amber-300"
          : "bg-white border-neutral-300 text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
      } ${className}`}
      title={`Switch to ${resolvedTheme === "dark" ? "light" : "dark"} theme`}
    >
      {resolvedTheme === "dark" ? (
        <Sun className="w-4 h-4 transition-transform duration-200 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 transition-transform duration-200 -rotate-12 hover:rotate-0" />
      )}
    </button>
  );
};

