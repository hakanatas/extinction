/* A pixel poster carries two data URLs, so a handful of them blows past
 * localStorage's quota. IndexedDB is the only local store that holds them
 * comfortably — this is the smallest wrapper that makes it feel like a
 * key/value map. */

import type { PixelSettings } from "@/lib/pixelate";

export interface Work {
  id: string;
  /** Common name, e.g. "Sumatra Kaplanı". */
  title: string;
  /** Binomial name, set in italics on the poster. */
  latin: string;
  /** Individuals left — the number of pixels on the canvas. */
  count: number;
  /** Pixels actually painted; equals `count` unless the picture couldn't carry it. */
  actual: number;
  region: string;
  /** IUCN-style status key, see `STATUSES`. */
  status: string;
  note: string;
  source: string;
  poster: string;
  cols: number;
  rows: number;
  settings: PixelSettings;
  createdAt: number;
  /** In the gallery's selection, and therefore in the presentation. */
  selected: boolean;
}

const DB = "extinction";
const STORE = "works";

let handle: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (handle) return handle;
  handle = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return handle;
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, mode);
    const req = run(t.objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function allWorks(): Promise<Work[]> {
  const rows = await tx<Work[]>("readonly", (s) => s.getAll() as IDBRequest<Work[]>);
  return rows.sort((a, b) => b.createdAt - a.createdAt);
}

export async function putWork(work: Work) {
  await tx("readwrite", (s) => s.put(work) as IDBRequest);
  return work;
}

export async function deleteWork(id: string) {
  await tx("readwrite", (s) => s.delete(id) as IDBRequest);
}

export async function clearWorks() {
  await tx("readwrite", (s) => s.clear() as IDBRequest);
}
