import "./globals.css";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-6xl p-6">
          <header className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-semibold">Simple SalesFlow</h1>
            <nav className="text-sm text-gray-600">Lightweight outreach automation</nav>
          </header>
          {children}
        </div>
      </body>
    </html>
  );
}
