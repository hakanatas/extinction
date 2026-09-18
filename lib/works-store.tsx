"use client";

import * as React from "react";
import { allWorks, deleteWork, putWork, type Work } from "@/lib/db";

interface Store {
  works: Work[];
  ready: boolean;
  selected: Work[];
  save: (work: Work) => Promise<void>;
  remove: (id: string) => Promise<void>;
  toggle: (id: string) => Promise<void>;
  selectAll: (on: boolean) => Promise<void>;
  byId: (id: string) => Work | undefined;
}

const Ctx = React.createContext<Store | null>(null);

export function WorksProvider({ children }: { children: React.ReactNode }) {
  const [works, setWorks] = React.useState<Work[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    let live = true;
    allWorks()
      .then((rows) => live && setWorks(rows))
      .catch(() => undefined)
      .finally(() => live && setReady(true));
    return () => {
      live = false;
    };
  }, []);

  const save = React.useCallback(async (work: Work) => {
    await putWork(work);
    setWorks((prev) => {
      const next = prev.filter((w) => w.id !== work.id);
      return [work, ...next].sort((a, b) => b.createdAt - a.createdAt);
    });
  }, []);

  const remove = React.useCallback(async (id: string) => {
    await deleteWork(id);
    setWorks((prev) => prev.filter((w) => w.id !== id));
  }, []);

  const toggle = React.useCallback(async (id: string) => {
    let updated: Work | undefined;
    setWorks((prev) =>
      prev.map((w) => {
        if (w.id !== id) return w;
        updated = { ...w, selected: !w.selected };
        return updated;
      }),
    );
    // The optimistic swap above is what the UI reacts to; the write just
    // has to land before the next reload.
    if (updated) await putWork(updated);
  }, []);

  const selectAll = React.useCallback(async (on: boolean) => {
    let next: Work[] = [];
    setWorks((prev) => {
      next = prev.map((w) => ({ ...w, selected: on }));
      return next;
    });
    await Promise.all(next.map(putWork));
  }, []);

  const value = React.useMemo<Store>(
    () => ({
      works,
      ready,
      selected: works.filter((w) => w.selected),
      save,
      remove,
      toggle,
      selectAll,
      byId: (id) => works.find((w) => w.id === id),
    }),
    [works, ready, save, remove, toggle, selectAll],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorks() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useWorks, <WorksProvider> içinde kullanılmalı.");
  return ctx;
}

export const STATUSES: { key: string; label: string; short: string; tone: string }[] = [
  { key: "EX", label: "Tükenmiş", short: "EX", tone: "oklch(0.55 0.02 286)" },
  { key: "EW", label: "Doğada tükenmiş", short: "EW", tone: "oklch(0.6 0.05 300)" },
  { key: "CR", label: "Kritik tehlikede", short: "CR", tone: "oklch(0.62 0.21 26)" },
  { key: "EN", label: "Tehlikede", short: "EN", tone: "oklch(0.72 0.18 48)" },
  { key: "VU", label: "Hassas", short: "VU", tone: "oklch(0.82 0.16 92)" },
  { key: "NT", label: "Tehdide yakın", short: "NT", tone: "oklch(0.8 0.12 130)" },
  { key: "LC", label: "Az endişe verici", short: "LC", tone: "oklch(0.78 0.14 168)" },
];

export function statusOf(key: string) {
  return STATUSES.find((s) => s.key === key) ?? STATUSES[3];
}
