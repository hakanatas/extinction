"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Images, Layers, Play, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorks } from "@/lib/works-store";

const LINKS = [
  { href: "/", label: "Manifesto", icon: Sparkles },
  { href: "/studio", label: "Stüdyo", icon: Layers },
  { href: "/gallery", label: "Galeri", icon: Images },
];

export function SiteNav() {
  const pathname = usePathname();
  const { selected } = useWorks();

  // The presentation is meant to be projected; chrome has no business there.
  if (pathname?.startsWith("/present")) return null;

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center px-4 pt-4">
      <nav className="glass pointer-events-auto flex items-center gap-1 rounded-full border border-border/70 p-1.5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]">
        <Link
          href="/"
          className="mr-1 flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium tracking-tight"
        >
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inset-0 animate-pulse-soft rounded-full bg-ember" />
          </span>
          <span className="hidden sm:inline">Extinction</span>
        </Link>

        <span className="mx-1 hidden h-5 w-px bg-border sm:block" />

        {LINKS.map((l) => {
          const active = l.href === "/" ? pathname === "/" : pathname?.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm transition-colors duration-200",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <l.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{l.label}</span>
            </Link>
          );
        })}

        <Link
          href="/present"
          className={cn(
            "ml-1 flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground",
            "transition-transform duration-200 hover:brightness-110 active:scale-95",
            selected.length === 0 && "pointer-events-none opacity-40",
          )}
        >
          <Play className="h-3.5 w-3.5 fill-current" />
          <span className="hidden sm:inline">Sunum</span>
          {selected.length > 0 && (
            <span className="tabular rounded-full bg-primary-foreground/20 px-1.5 text-xs">
              {selected.length}
            </span>
          )}
        </Link>
      </nav>
    </header>
  );
}
