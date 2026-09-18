"use client";

import * as React from "react";
import { allWorks, deleteWork, putWork, type Work } from "@/lib/db";
import {
  dehydrate,
  hydrate,
  loadManifest,
  type Manifest,
  type PublishedWork,
} from "@/lib/published";
import {
  commitFiles,
  dataUrlExtension,
  dataUrlToBase64,
  textToBase64,
  verifyToken,
} from "@/lib/github";
import { CONTENT, REPO } from "@/lib/repo";

/** Where a work came from, which decides who is allowed to remove it. */
export type Origin = "published" | "local";
export type GalleryWork = Work & { origin: Origin };

const TOKEN_KEY = "extinction.admin.token";
const HIDDEN_KEY = "extinction.deck.hidden";

interface Store {
  works: GalleryWork[];
  ready: boolean;
  /** The presentation deck: everything not hidden on this device. */
  selected: GalleryWork[];
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  selectAll: (on: boolean) => void;

  isAdmin: boolean;
  signIn: (token: string) => Promise<void>;
  signOut: () => void;

  /** Keep a work on this device only. */
  saveLocal: (work: Work) => Promise<void>;
  /** Commit a work to the repository so every visitor gets it. */
  publish: (work: Work) => Promise<void>;
  remove: (work: GalleryWork) => Promise<void>;
  busy: string | null;

  byId: (id: string) => GalleryWork | undefined;
}

const Ctx = React.createContext<Store | null>(null);

/** localStorage is allowed to be missing, full, or blocked; none of it is fatal. */
function readStored<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeStored(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* a viewer with storage disabled simply gets no memory of their deck */
  }
}

export function WorksProvider({ children }: { children: React.ReactNode }) {
  const [manifest, setManifest] = React.useState<Manifest | null>(null);
  const [local, setLocal] = React.useState<Work[]>([]);
  const [hidden, setHidden] = React.useState<string[]>([]);
  const [token, setToken] = React.useState<string | null>(null);
  const [ready, setReady] = React.useState(false);
  const [busy, setBusy] = React.useState<string | null>(null);

  /* ── first load: the shared gallery, this device's drafts, this
        device's deck choices, and an admin token if one was stored ── */
  React.useEffect(() => {
    let live = true;

    Promise.all([loadManifest(), allWorks()])
      .then(([published, drafts]) => {
        if (!live) return;
        setManifest(published);
        // A draft whose id is in the manifest has finished deploying, so the
        // local copy has done its job and would only show up twice.
        const ids = new Set(published.works.map((w) => w.id));
        const remaining = drafts.filter((d) => !ids.has(d.id));
        drafts.filter((d) => ids.has(d.id)).forEach((d) => deleteWork(d.id).catch(() => undefined));
        setLocal(remaining);
      })
      .catch(() => undefined)
      .finally(() => live && setReady(true));

    setHidden(readStored<string[]>(HIDDEN_KEY, []));
    const stored = readStored<string | null>(TOKEN_KEY, null);
    if (stored) {
      // Trust it enough to show the admin controls, but drop it quietly if
      // GitHub says it is no longer good.
      verifyToken(stored)
        .then(() => live && setToken(stored))
        .catch(() => {
          try {
            localStorage.removeItem(TOKEN_KEY);
          } catch {
            /* nothing to clean up */
          }
        });
    }

    return () => {
      live = false;
    };
  }, []);

  const works = React.useMemo<GalleryWork[]>(() => {
    const published = (manifest?.works ?? []).map((w) => ({
      ...hydrate(w),
      origin: "published" as const,
    }));
    const drafts = local.map((w) => ({ ...w, origin: "local" as const }));
    return [...drafts, ...published].sort((a, b) => b.createdAt - a.createdAt);
  }, [manifest, local]);

  const setHiddenPersisted = React.useCallback((next: string[]) => {
    setHidden(next);
    writeStored(HIDDEN_KEY, next);
  }, []);

  const toggle = React.useCallback(
    (id: string) =>
      setHiddenPersisted(hidden.includes(id) ? hidden.filter((x) => x !== id) : [...hidden, id]),
    [hidden, setHiddenPersisted],
  );

  const selectAll = React.useCallback(
    (on: boolean) => setHiddenPersisted(on ? [] : works.map((w) => w.id)),
    [works, setHiddenPersisted],
  );

  const saveLocal = React.useCallback(async (work: Work) => {
    await putWork(work);
    setLocal((prev) => [work, ...prev.filter((w) => w.id !== work.id)]);
  }, []);

  const signIn = React.useCallback(async (candidate: string) => {
    await verifyToken(candidate);
    writeStored(TOKEN_KEY, candidate);
    setToken(candidate);
  }, []);

  const signOut = React.useCallback(() => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* already gone */
    }
    setToken(null);
  }, []);

  /** Write the manifest and the work's two images in one commit. */
  const publish = React.useCallback(
    async (work: Work) => {
      if (!token) throw new Error("Yayınlamak için yönetici girişi gerekiyor.");
      setBusy(work.id);
      try {
        // The extension has to match the bytes: the poster is WebP where the
        // browser could encode it and PNG where it could not, and a static
        // host serves the content type straight off the file name.
        const sourcePath = CONTENT.source(work.id, dataUrlExtension(work.source));
        const posterPath = CONTENT.poster(work.id, dataUrlExtension(work.poster));
        const entry = dehydrate(work, sourcePath, posterPath);

        // Re-read rather than trusting what this tab loaded: another admin
        // may have published since.
        const current = await loadManifest(true);
        const next: Manifest = {
          version: 1,
          updatedAt: new Date().toISOString(),
          works: [entry, ...current.works.filter((w) => w.id !== work.id)],
        };

        await commitFiles({
          token,
          message: `Galeriye ekle: ${work.title}`,
          writes: [
            { path: posterPath, base64: dataUrlToBase64(work.poster) },
            { path: sourcePath, base64: dataUrlToBase64(work.source) },
            { path: CONTENT.index, base64: textToBase64(`${JSON.stringify(next, null, 2)}\n`) },
          ],
        });

        // Show it immediately, marked as in flight; the deploy makes it real
        // in about a minute and the next load drops this copy.
        await saveLocal({ ...work, pendingPublish: true });
      } finally {
        setBusy(null);
      }
    },
    [token, saveLocal],
  );

  const remove = React.useCallback(
    async (work: GalleryWork) => {
      if (work.origin === "local") {
        await deleteWork(work.id);
        setLocal((prev) => prev.filter((w) => w.id !== work.id));
        return;
      }
      if (!token) throw new Error("Yayındaki bir eseri kaldırmak için yönetici girişi gerekiyor.");

      setBusy(work.id);
      try {
        const current = await loadManifest(true);
        const entry = current.works.find((w) => w.id === work.id);
        const next: Manifest = {
          version: 1,
          updatedAt: new Date().toISOString(),
          works: current.works.filter((w) => w.id !== work.id),
        };

        await commitFiles({
          token,
          message: `Galeriden kaldır: ${work.title}`,
          writes: [
            { path: CONTENT.index, base64: textToBase64(`${JSON.stringify(next, null, 2)}\n`) },
          ],
          deletes: entry ? [entry.posterPath, entry.sourcePath] : [],
        });

        setManifest(next);
      } finally {
        setBusy(null);
      }
    },
    [token],
  );

  const value = React.useMemo<Store>(() => {
    const isSelected = (id: string) => !hidden.includes(id);
    return {
      works,
      ready,
      selected: works.filter((w) => isSelected(w.id)),
      isSelected,
      toggle,
      selectAll,
      isAdmin: Boolean(token),
      signIn,
      signOut,
      saveLocal,
      publish,
      remove,
      busy,
      byId: (id) => works.find((w) => w.id === id),
    };
  }, [works, ready, hidden, token, busy, toggle, selectAll, signIn, signOut, saveLocal, publish, remove]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorks() {
  const ctx = React.useContext(Ctx);
  if (!ctx) throw new Error("useWorks, <WorksProvider> içinde kullanılmalı.");
  return ctx;
}

export const CONTENT_TARGET = `${REPO.owner}/${REPO.repo} · ${REPO.branch}`;

export type { PublishedWork };

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
