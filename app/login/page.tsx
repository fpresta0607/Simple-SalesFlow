"use client";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const sp = useSearchParams();
  const error = sp.get("error") || undefined;
  const callbackUrl = sp.get("callbackUrl") || "/";
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-3">
      {/* Hero moved from home */}
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            There was a problem signing in. <a href={`/api/auth/signin/azure-ad?callbackUrl=${encodeURIComponent(callbackUrl)}`} className="underline">Try again</a> or <a className="underline" href="mailto:info@siqstack.com">Contact support</a>.
          </div>
        )}
        <h1 className="mb-3 text-3xl font-semibold tracking-tight">Upload your contacts. Get personalized emails in minutes.</h1>
        <p className="mb-6 text-gray-700">AI generates subject & body. Review, select, and send.</p>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => signIn("azure-ad", { callbackUrl })} className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-700">
            <span className="inline-block" aria-hidden>
              {/* Microsoft logo */}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="2" y="2" width="9" height="9" fill="#F25022"/>
                <rect x="13" y="2" width="9" height="9" fill="#7FBA00"/>
                <rect x="2" y="13" width="9" height="9" fill="#00A4EF"/>
                <rect x="13" y="13" width="9" height="9" fill="#FFB900"/>
              </svg>
            </span>
            <span>Sign in with Microsoft</span>
          </button>
        </div>
      </section>
    </main>
  );
}
