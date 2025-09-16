export default function HomePage() {
  return (
    <main className="space-y-6">
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <h2 className="mb-2 text-lg font-semibold">Welcome</h2>
        <p className="text-sm text-gray-600">
          Sign in with Google, upload contacts (CSV/XLSX), generate personalized drafts with GPT, review, and send via Resend.
        </p>
      </section>
      <div className="flex gap-3">
        <a href="/upload" className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">Get Started</a>
        <a href="/api/auth/signin" className="rounded border px-4 py-2 hover:bg-gray-50">Sign In</a>
      </div>
    </main>
  );
}
