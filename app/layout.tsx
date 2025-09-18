import "./globals.css";
import { ReactNode } from "react";
import NavLinks from "./components/NavLinks";
import UserMenu from "./components/UserMenu";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {/* Sticky navbar */}
        <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 lg:px-6">
            <a href="/" className="text-base font-semibold tracking-tight">Simple SalesFlow</a>
            <div className="flex items-center gap-4">
              <NavLinks />
              {/* Separator */}
              <div className="hidden h-5 w-px bg-slate-200 sm:block" />
              {/* User menu */}
              <UserMenu />
            </div>
          </div>
        </header>
        {/* Page content can span full width; pages control their own containers */}
        <div className="px-3 pb-8 pt-4 lg:px-6">
          {children}
        </div>
      </body>
    </html>
  );
}
