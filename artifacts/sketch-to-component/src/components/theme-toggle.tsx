import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = resolvedTheme === "dark";

  return (
    <Button
      type="button"
      variant="heroSecondary"
      size="icon"
      className="relative h-9 w-9 shrink-0 rounded-full"
      aria-label={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
      disabled={!mounted}
    >
      {mounted ? (
        isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />
      ) : (
        <Sun className="h-4 w-4 opacity-50" />
      )}
    </Button>
  );
}
