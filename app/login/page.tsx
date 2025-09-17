"use client";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const callbackUrl = "/upload";
  return (
    <main className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-center text-xl font-semibold tracking-tight">Sign in</h2>
            <button
              onClick={() => signIn("azure-ad", { callbackUrl })}
              className="w-full rounded-full bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-700"
            >
              Continue with Microsoft
            </button>
      </div>
    </main>
  );
}
