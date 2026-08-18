import { useContext } from 'react';
import { LanguageContext, type LanguageContextValue } from './languageContextValue';

export function useLanguage(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error('useLanguage() must be used inside a <LanguageProvider>');
  }
  return ctx;
}
