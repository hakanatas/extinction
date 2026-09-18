"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { KeyRound, Loader2, LogOut, ShieldCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { CONTENT_TARGET, useWorks } from "@/lib/works-store";
import { cn } from "@/lib/utils";

/**
 * Admin sign-in.
 *
 * There is no server to hold an account, so the credential is a GitHub
 * token scoped to this one repository: whoever can commit to the repo can
 * publish to the gallery, which is the same thing. It is kept in this
 * browser and never leaves it except as an Authorization header to GitHub.
 */
export function AdminGate({ className }: { className?: string }) {
  const { isAdmin, signIn, signOut } = useWorks();
  const [open, setOpen] = React.useState(false);
  const [token, setToken] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await signIn(token.trim());
      setToken("");
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Giriş yapılamadı.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={isAdmin ? "Yönetici oturumu açık" : "Yönetici girişi"}
        aria-label={isAdmin ? "Yönetici oturumu açık" : "Yönetici girişi"}
        className={cn(
          "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
          isAdmin ? "text-primary" : "text-muted-foreground hover:text-foreground",
          className,
        )}
      >
        {isAdmin ? <ShieldCheck className="h-4 w-4" /> : <KeyRound className="h-4 w-4" />}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[70] flex items-center justify-center bg-background/90 p-6 backdrop-blur-xl"
          >
            <motion.div
              initial={{ scale: 0.97, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-8"
            >
              <button
                onClick={() => setOpen(false)}
                aria-label="Kapat"
                className="absolute right-5 top-5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>

              <h2 className="font-display text-3xl tracking-tight">Yönetici</h2>

              {isAdmin ? (
                <>
                  <p className="mt-4 text-[1.02rem] leading-relaxed text-muted-foreground">
                    Oturum açık. Eser ekleyip kaldırabilirsiniz; her işlem
                    <span className="font-mono text-foreground"> {CONTENT_TARGET}</span> dalına bir
                    commit atar ve site yaklaşık bir dakika içinde yeniden yayınlanır.
                  </p>
                  <Button
                    variant="outline"
                    className="mt-7"
                    onClick={() => {
                      signOut();
                      setOpen(false);
                    }}
                  >
                    <LogOut className="h-4 w-4" />
                    Çıkış yap
                  </Button>
                </>
              ) : (
                <form onSubmit={submit} className="mt-4 space-y-5">
                  <p className="text-[1.02rem] leading-relaxed text-muted-foreground">
                    Galeri depoda duruyor, bu yüzden anahtar da depoya ait: yalnızca
                    <span className="font-mono text-foreground"> {CONTENT_TARGET}</span> için
                    <span className="text-foreground"> Contents: read and write</span> izni olan
                    ince ayarlı (fine-grained) bir GitHub token'ı yapıştırın.
                  </p>

                  <div className="space-y-2">
                    <Label htmlFor="token">GitHub token</Label>
                    <Input
                      id="token"
                      type="password"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="github_pat_..."
                      value={token}
                      onChange={(e) => setToken(e.target.value)}
                      className="font-mono text-sm"
                    />
                  </div>

                  {error && <p className="text-[0.95rem] text-destructive">{error}</p>}

                  <div className="flex items-center gap-3">
                    <Button type="submit" disabled={busy || token.trim().length < 20}>
                      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                      Giriş yap
                    </Button>
                    <a
                      href="https://github.com/settings/personal-access-tokens/new"
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-[0.95rem] text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      Token oluştur
                    </a>
                  </div>

                  <p className="text-[0.88rem] leading-relaxed text-muted-foreground/80">
                    Token yalnızca bu tarayıcıda saklanır ve GitHub dışında hiçbir yere
                    gönderilmez. Depoya yazılan hiçbir dosyaya da girmez.
                  </p>
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
