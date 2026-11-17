import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";

const LINKS = [
  { href: "/", label: "Home", key: "home" },
  { href: "/profile", label: "Portfolio", key: "portfolio" },
  { href: "/projects", label: "Projects", key: "projects" },
] as const;

export function SiteHeader({ name, active }: { name: string; active: "home" | "portfolio" | "projects" }) {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-5">
        <span className="hidden font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground sm:block">
          {name || "Profile"}
        </span>
        <nav className="flex items-center gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.key}
              href={link.href}
              aria-current={active === link.key ? "page" : undefined}
              className={
                active === link.key
                  ? "rounded-full bg-secondary px-3.5 py-1.5 text-sm font-medium text-secondary-foreground"
                  : "rounded-full px-3.5 py-1.5 text-sm text-muted-foreground hover:text-foreground"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </header>
  );
}
