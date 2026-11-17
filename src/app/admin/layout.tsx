import Link from "next/link";
import type { Metadata } from "next";
import { requireAdmin } from "@/lib/admin";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = { title: "Donna — Admin", robots: { index: false } };

const NAV = [
  { href: "/admin", label: "Usage" },
  { href: "/admin/links", label: "Access links" },
  { href: "/admin/projects", label: "Projects" },
  { href: "/admin/knowledge", label: "Knowledge" },
  { href: "/admin/timeline", label: "Timeline" },
  { href: "/admin/sandbox", label: "Test Donna" },
  { href: "/admin/gaps", label: "Knowledge gaps" },
  { href: "/admin/settings", label: "Limits" },
  { href: "/admin/privacy", label: "Privacy page" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdmin();
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[220px_1fr]">
      <aside className="border-b md:border-b-0 md:border-r bg-sidebar px-4 py-4 md:py-6 md:min-h-dvh">
        <div className="flex items-center justify-between md:block">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">Donna · Admin</p>
          <div className="md:hidden">
            <ThemeToggle />
          </div>
        </div>
        <nav className="mt-3 md:mt-6 flex md:flex-col gap-1 overflow-x-auto">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm text-foreground/80 hover:bg-muted hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="hidden md:block mt-8 space-y-3 text-xs text-muted-foreground">
          <p className="truncate">{session.user?.email ?? session.user?.name}</p>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <a href="/api/admin/logout" className="underline underline-offset-4 hover:text-foreground">
              Log out
            </a>
          </div>
        </div>
        <a href="/api/admin/logout" className="md:hidden mt-2 inline-block text-xs underline underline-offset-4">
          Log out
        </a>
      </aside>
      <main className="px-4 py-6 md:px-10 md:py-10 max-w-6xl w-full">{children}</main>
    </div>
  );
}
