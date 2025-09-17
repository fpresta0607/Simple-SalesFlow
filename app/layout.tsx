import "./globals.css";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        {/* Header stays centered with a comfortable max-width */}
        <header className="mx-auto mb-4 flex max-w-6xl items-center justify-between px-4 py-4 lg:px-6">
          <h1 className="text-xl font-semibold">Simple SalesFlow</h1>
          <nav className="text-sm text-gray-600">Lightweight outreach automation</nav>
        </header>
        {/* Page content can span full width; pages control their own containers */}
        <div className="px-3 pb-8 lg:px-6">
          {children}
        </div>
      </body>
    </html>
  );
}
