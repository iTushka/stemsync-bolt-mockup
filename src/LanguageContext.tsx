import { type ReactNode } from 'react';
import { usePersistentState } from './usePersistentState';
import { STRINGS, type Lang } from './strings';
import { LanguageContext } from './languageContextValue';

/** Wraps the app once, near the root — see main.tsx. Persists the chosen
 *  language the same way everything else in the app persists (localStorage,
 *  namespaced per pilot via usePersistentState), so it survives a reload. */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = usePersistentState<Lang>('language', 'en');

  const t = (key: keyof typeof STRINGS): string => {
    const entry = STRINGS[key];
    return entry[lang] || entry.en;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>
  );
}
