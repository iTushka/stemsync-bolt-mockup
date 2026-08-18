import { createContext } from 'react';
import type { Lang, StringKey } from './strings';

export interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  /** Looks up a key in strings.ts. Falls back to the English value if the
   *  current language doesn't have that key yet — see the "Coverage note"
   *  in strings.ts. Never throws, never shows a blank string. */
  t: (key: StringKey) => string;
}

export const LanguageContext = createContext<LanguageContextValue | null>(null);
