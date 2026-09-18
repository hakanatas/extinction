/** Prefix for anything referenced by URL rather than imported.
 *
 * Next rewrites its own asset URLs for `basePath`, but a plain `src="/x.svg"`
 * in JSX it leaves alone — so files served out of `public/` go through here.
 * Read from the build-time env var, which is why it is inlined as a constant.
 */
export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export function asset(path: string) {
  return `${BASE_PATH}${path.startsWith("/") ? path : `/${path}`}`;
}
