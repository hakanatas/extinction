/* Where the published gallery lives.
 *
 * The site is static, so the repository *is* the database: published works
 * are files in it, and a publish is a commit. These values are baked in at
 * build time — the deploy workflow fills them from the repository it is
 * building, so a fork or a renamed branch keeps working without an edit. */

const [owner = "hakanatas", repo = "extinction"] = (
  process.env.NEXT_PUBLIC_REPO ?? "hakanatas/extinction"
).split("/");

export const REPO = {
  owner,
  repo,
  branch: process.env.NEXT_PUBLIC_REPO_BRANCH ?? "main",
  /** Overridable so tests can point the client at a stand-in API. */
  api: process.env.NEXT_PUBLIC_GITHUB_API ?? "https://api.github.com",
} as const;

/** Paths inside the repository, relative to its root. */
export const CONTENT = {
  index: "public/content/works.json",
  poster: (id: string, ext: string) => `public/content/works/${id}.${ext}`,
  source: (id: string, ext: string) => `public/content/sources/${id}.${ext}`,
} as const;
