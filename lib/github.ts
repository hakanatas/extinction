"use client";

/* ── publishing ──────────────────────────────────────────────────
 * A publish is a commit. Everything here builds exactly one, through
 * the Git Data API, rather than the one-file-at-a-time Contents API:
 * a work is three files (poster, source, manifest) and three commits
 * would mean three deploys and two intermediate states where the
 * manifest points at files that aren't there yet.
 *
 * The token is the admin login. It is a fine-grained personal access
 * token with Contents: read and write on this repository and nothing
 * else, it is kept in the admin's own browser, and it is never written
 * into anything this code commits.
 * ─────────────────────────────────────────────────────────────── */

import { REPO } from "@/lib/repo";

export interface FileWrite {
  path: string;
  /** Raw base64 payload — an image data URL's tail goes straight in. */
  base64: string;
}

export class GitHubError extends Error {}

async function api(token: string, path: string, init?: RequestInit) {
  const res = await fetch(`${REPO.api}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new GitHubError(
      res.status === 401
        ? "Token geçersiz ya da süresi dolmuş."
        : res.status === 403
          ? "Bu token'ın bu depoya yazma izni yok."
          : res.status === 404
            ? "Depo bulunamadı; token'ın kapsamını kontrol edin."
            : (detail?.message ?? `GitHub hatası (${res.status}).`),
    );
  }
  return res.status === 204 ? null : res.json();
}

const REPO_PATH = () => `/repos/${REPO.owner}/${REPO.repo}`;

export interface Identity {
  repo: string;
  branch: string;
  canPush: boolean;
}

/** Confirm a token before storing it, so a bad paste fails at the door. */
export async function verifyToken(token: string): Promise<Identity> {
  const data = await api(token, REPO_PATH());
  const canPush = Boolean(data?.permissions?.push ?? data?.permissions?.maintain);
  if (!canPush) throw new GitHubError("Bu token depoya yazamıyor (Contents: read and write gerekir).");
  return { repo: data.full_name, branch: REPO.branch, canPush };
}

/** UTF-8 text to base64, the long way round because btoa is bytes-only. */
export function textToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** `data:image/png;base64,AAAA` → `AAAA` */
export function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1);
}

export function dataUrlExtension(dataUrl: string): string {
  const match = /^data:image\/([a-z0-9.+-]+)/i.exec(dataUrl);
  const type = (match?.[1] ?? "png").toLowerCase();
  return type === "jpeg" ? "jpg" : type;
}

/**
 * Write and delete a set of paths in a single commit on the content branch.
 * Retries once if someone else pushed in between, which is the only
 * conflict a two-file gallery can realistically produce.
 */
export async function commitFiles({
  token,
  message,
  writes = [],
  deletes = [],
}: {
  token: string;
  message: string;
  writes?: FileWrite[];
  deletes?: string[];
}): Promise<{ commit: string }> {
  for (let attempt = 0; ; attempt++) {
    try {
      const ref = await api(token, `${REPO_PATH()}/git/ref/heads/${REPO.branch}`);
      const head = ref.object.sha as string;
      const headCommit = await api(token, `${REPO_PATH()}/git/commits/${head}`);

      const blobs = await Promise.all(
        writes.map(async (file) => {
          const blob = await api(token, `${REPO_PATH()}/git/blobs`, {
            method: "POST",
            body: JSON.stringify({ content: file.base64, encoding: "base64" }),
          });
          return { path: file.path, mode: "100644", type: "blob", sha: blob.sha as string };
        }),
      );

      const tree = await api(token, `${REPO_PATH()}/git/trees`, {
        method: "POST",
        body: JSON.stringify({
          base_tree: headCommit.tree.sha,
          tree: [
            ...blobs,
            // A null sha on an existing path is how the Git Data API spells
            // "remove this file".
            ...deletes.map((path) => ({ path, mode: "100644", type: "blob", sha: null })),
          ],
        }),
      });

      const commit = await api(token, `${REPO_PATH()}/git/commits`, {
        method: "POST",
        body: JSON.stringify({ message, tree: tree.sha, parents: [head] }),
      });

      await api(token, `${REPO_PATH()}/git/refs/heads/${REPO.branch}`, {
        method: "PATCH",
        body: JSON.stringify({ sha: commit.sha }),
      });

      return { commit: commit.sha as string };
    } catch (error) {
      const moved = error instanceof GitHubError && /fast forward|not a fast|conflict/i.test(error.message);
      if (attempt >= 1 || !moved) throw error;
    }
  }
}
