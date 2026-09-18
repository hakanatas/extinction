"use client";

/* Reading side of the published gallery: a plain JSON file served next to
 * the site, so every visitor sees the same works with no account, no API
 * and no request that can fail differently for different people. */

import type { Work } from "@/lib/db";
import { asset } from "@/lib/base-path";

/** A work as it is stored in the repository. */
export type PublishedWork = Omit<Work, "source" | "poster"> & {
  /** Repo-relative published paths, resolved against the base path on read. */
  sourcePath: string;
  posterPath: string;
};

export interface Manifest {
  version: 1;
  updatedAt: string;
  works: PublishedWork[];
}

export const EMPTY_MANIFEST: Manifest = { version: 1, updatedAt: "", works: [] };

/** Turn stored paths back into URLs this deployment can actually load. */
export function hydrate(work: PublishedWork): Work {
  return {
    ...work,
    source: asset(`/${work.sourcePath.replace(/^public\//, "")}`),
    poster: asset(`/${work.posterPath.replace(/^public\//, "")}`),
  };
}

export function dehydrate(work: Work, sourcePath: string, posterPath: string): PublishedWork {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { source, poster, ...rest } = work;
  return { ...rest, sourcePath, posterPath };
}

/**
 * Fetch the manifest. A missing file is not an error — it is simply a gallery
 * nobody has published to yet.
 */
export async function loadManifest(bust = false): Promise<Manifest> {
  try {
    const url = asset("/content/works.json") + (bust ? `?t=${Date.now()}` : "");
    const res = await fetch(url, { cache: bust ? "no-store" : "default" });
    if (!res.ok) return EMPTY_MANIFEST;
    const data = (await res.json()) as Manifest;
    if (!Array.isArray(data?.works)) return EMPTY_MANIFEST;
    return data;
  } catch {
    return EMPTY_MANIFEST;
  }
}
