import { useEffect, useMemo, useState } from "react";

import { columnDefinitions, defaultVisibleColumns, type ColumnKey } from "./columns";

function readStoredVisibleColumns(storageKey?: string) {
  if (!storageKey || typeof window === "undefined") {
    return null;
  }

  const savedValue = window.localStorage.getItem(storageKey);
  if (!savedValue) {
    return null;
  }

  try {
    const parsedValue = JSON.parse(savedValue) as ColumnKey[];
    const allowedValues = parsedValue.filter((value) =>
      columnDefinitions.some((definition) => definition.key === value),
    );
    return allowedValues.length ? allowedValues : null;
  } catch {
    return null;
  }
}

function buildScopedStorageKey(storageKey?: string, storageScope?: string | null) {
  if (!storageKey) return null;
  if (!storageScope) return storageKey;
  return `${storageScope}:${storageKey}`;
}

function getInitialVisibleColumnsWithScope(
  storageKey?: string,
  storageScope?: string | null,
) {
  const scopedStorageKey = buildScopedStorageKey(storageKey, storageScope);
  if (!scopedStorageKey || typeof window === "undefined") {
    return defaultVisibleColumns;
  }

  const fromScoped = readStoredVisibleColumns(scopedStorageKey);
  if (fromScoped) {
    return fromScoped;
  }

  if (storageScope) {
    const fromLegacy = readStoredVisibleColumns(storageKey);
    if (fromLegacy) {
      return fromLegacy;
    }
  }

  return defaultVisibleColumns;
}

type UseColumnPreferencesOptions = {
  storageKey?: string;
  storageScope?: string | null;
  preferencesAuthToken?: string | null;
};

type UseColumnPreferencesResult = {
  visibleColumns: ColumnKey[];
  setVisibleColumns: React.Dispatch<React.SetStateAction<ColumnKey[]>>;
  columnsInitialized: boolean;
};

export function useColumnPreferences({
  storageKey,
  storageScope,
  preferencesAuthToken,
}: UseColumnPreferencesOptions): UseColumnPreferencesResult {
  const [visibleColumns, setVisibleColumns] = useState<ColumnKey[]>(defaultVisibleColumns);
  const [columnsInitialized, setColumnsInitialized] = useState(false);
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);

  const scopedStorageKey = useMemo(
    () => buildScopedStorageKey(storageKey, storageScope),
    [storageKey, storageScope],
  );

  useEffect(() => {
    setColumnsInitialized(false);
    setVisibleColumns(getInitialVisibleColumnsWithScope(storageKey, storageScope));
    setColumnsInitialized(true);
  }, [storageKey, storageScope]);

  useEffect(() => {
    if (!columnsInitialized) {
      return;
    }
    if (!scopedStorageKey || !preferencesAuthToken) {
      setPreferencesHydrated(true);
      return;
    }

    let cancelled = false;
    setPreferencesHydrated(false);

    const hydrate = async () => {
      try {
        const response = await fetch(
          `/api/dashboard/preferences?key=${encodeURIComponent(scopedStorageKey)}`,
          {
            method: "GET",
            headers: {
              Authorization: `Bearer ${preferencesAuthToken}`,
            },
          },
        );
        if (!response.ok) return;
        const payload = (await response.json().catch(() => null)) as
          | { value?: { visibleColumns?: unknown } | null }
          | null;
        const remoteColumns = payload?.value?.visibleColumns;
        if (!Array.isArray(remoteColumns) || cancelled) return;
        const nextColumns = remoteColumns.filter((value): value is ColumnKey =>
          columnDefinitions.some((definition) => definition.key === value),
        );
        if (nextColumns.length) {
          setVisibleColumns(nextColumns);
        }
      } finally {
        if (!cancelled) {
          setPreferencesHydrated(true);
        }
      }
    };

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [columnsInitialized, preferencesAuthToken, scopedStorageKey]);

  useEffect(() => {
    if (!columnsInitialized) {
      return;
    }
    if (!scopedStorageKey || typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(scopedStorageKey, JSON.stringify(visibleColumns));
  }, [columnsInitialized, scopedStorageKey, visibleColumns]);

  useEffect(() => {
    if (
      !columnsInitialized ||
      !scopedStorageKey ||
      !preferencesAuthToken ||
      !preferencesHydrated
    ) {
      return;
    }

    const timeout = window.setTimeout(() => {
      void fetch("/api/dashboard/preferences", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${preferencesAuthToken}`,
        },
        body: JSON.stringify({
          key: scopedStorageKey,
          value: { visibleColumns },
        }),
      }).catch(() => null);
    }, 250);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [
    columnsInitialized,
    preferencesAuthToken,
    preferencesHydrated,
    scopedStorageKey,
    visibleColumns,
  ]);

  return { visibleColumns, setVisibleColumns, columnsInitialized };
}
