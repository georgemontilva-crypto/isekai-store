import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { es } from "./es";
import { en } from "./en";
import type { Translations } from "./es";

export type Lang = "es" | "en";

const STORAGE_KEY = "isekai-lang";

interface LangContextType {
  lang: Lang;
  t: Translations;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

const LangContext = createContext<LangContextType | null>(null);

const translations: Record<Lang, Translations> = { es, en };

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    // Default: Spanish. Persist user preference.
    const stored = localStorage.getItem(STORAGE_KEY) as Lang | null;
    if (stored === "es" || stored === "en") return stored;
    // Optionally auto-detect from browser
    const browser = navigator.language.toLowerCase();
    if (browser.startsWith("en")) return "en";
    return "es"; // default
  });

  const setLang = (next: Lang) => {
    setLangState(next);
    localStorage.setItem(STORAGE_KEY, next);
    document.documentElement.lang = next;
  };

  const toggleLang = () => setLang(lang === "es" ? "en" : "es");

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  return (
    <LangContext.Provider value={{ lang, t: translations[lang], setLang, toggleLang }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used inside LangProvider");
  return ctx;
}
