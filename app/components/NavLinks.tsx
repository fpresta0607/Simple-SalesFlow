"use client";
import { usePathname } from "next/navigation";

const links = [
  { href: "/upload", label: "Upload" },
  { href: "/settings", label: "Settings" },
  { href: "/drafts", label: "Drafts" },
  { href: "/logs", label: "Logs" },
];

export default function NavLinks() {
  const pathname = usePathname() || "/";
  return (
    <nav className="flex items-center gap-1 text-sm text-gray-700">
      {links.map((l) => {
        const active = pathname === l.href || pathname.startsWith(l.href + "/");
        return (
          <a
            key={l.href}
            href={l.href}
            className={`rounded-full px-3 py-1.5 transition-colors ${
              active ? "bg-slate-900 text-white" : "hover:bg-slate-100"
            }`}
            aria-current={active ? "page" : undefined}
          >
            {l.label}
          </a>
        );
      })}
    </nav>
  );
}
