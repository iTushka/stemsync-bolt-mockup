import { useState, useEffect } from 'react';
import { STORAGE_PREFIX, TENANT, PILOT_SLUG } from './config';

/**
 * Drop-in replacement for useState that also persists to localStorage,
 * namespaced per tenant (see config.ts). If reading or writing fails for
 * any reason (private browsing, storage full, first load) it silently
 * falls back to plain in-memory state rather than breaking the app.
 */
export function usePersistentState<T>(
  key: string,
  initial: T
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const storageKey = `${STORAGE_PREFIX}:${key}`;

  const [state, setState] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw !== null ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // Storage unavailable or full — the session still works in memory.
    }
  }, [state, storageKey]);

  return [state, setState];
}

/** Clears every key belonging to the current pilot — used by the
 *  "Reset test data" action in Settings. */
export function clearTenantStorage() {
  const toRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(`${STORAGE_PREFIX}:`)) toRemove.push(k);
  }
  toRemove.forEach((k) => localStorage.removeItem(k));
}

/** Downloads all of the current tenant's saved data as a single JSON file —
 *  the person can move it between devices/browsers by hand, no account or
 *  login required. */
export function exportTenantData(): void {
  const prefix = `${STORAGE_PREFIX}:`;
  const data: Record<string, unknown> = {};

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(prefix)) {
      const suffix = k.slice(prefix.length);
      try {
        data[suffix] = JSON.parse(localStorage.getItem(k) ?? 'null');
      } catch {
        // Skip anything that isn't valid JSON rather than failing the export.
      }
    }
  }

  const payload = { pilot: PILOT_SLUG, tenant: TENANT, exportedAt: new Date().toISOString(), data };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `stemsync-${PILOT_SLUG}-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Reads a previously exported JSON file and writes its contents back into
 *  this browser's storage under the CURRENT tenant, regardless of which
 *  tenant it was originally exported from — so it also works as a way to
 *  seed one instance from another during testing. Returns true on success. */
export async function importTenantData(file: File): Promise<boolean> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text) as { data?: Record<string, unknown> };
    if (!parsed?.data || typeof parsed.data !== 'object') return false;

    const prefix = `${STORAGE_PREFIX}:`;
    Object.entries(parsed.data).forEach(([suffix, value]) => {
      localStorage.setItem(`${prefix}${suffix}`, JSON.stringify(value));
    });
    return true;
  } catch {
    return false;
  }
}
