"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    resolvedTheme: "light" | "dark";
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>("system");
    const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">("light");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem("theme") as Theme | null;
        if (stored) {
            setTheme(stored);
        }
    }, []);

    useEffect(() => {
        if (!mounted) return;

        const root = document.documentElement;
        let resolved: "light" | "dark" = "light";

        if (theme === "system") {
            resolved = window.matchMedia("(prefers-color-scheme: dark)").matches
                ? "dark"
                : "light";
        } else {
            resolved = theme;
        }

        setResolvedTheme(resolved);
        root.classList.remove("light", "dark");
        root.classList.add(resolved);
        localStorage.setItem("theme", theme);
    }, [theme, mounted]);

    // Listen for system theme changes
    useEffect(() => {
        if (theme !== "system") return;

        const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (e: MediaQueryListEvent) => {
            setResolvedTheme(e.matches ? "dark" : "light");
            document.documentElement.classList.remove("light", "dark");
            document.documentElement.classList.add(e.matches ? "dark" : "light");
        };

        mediaQuery.addEventListener("change", handleChange);
        return () => mediaQuery.removeEventListener("change", handleChange);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
