export default function HomePage({ searchParams }: { searchParams?: { error?: string } }) {
  const error = searchParams?.error;
  return (
    <main className="space-y-12">
      {/* Hero */}
      <section className="rounded-lg border bg-white p-8 shadow-sm">
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            There was a problem signing in. <a href="/api/auth/signin/azure-ad?callbackUrl=%2Fupload" className="underline">Try again</a> or <a className="underline" href="mailto:support@example.com">Contact support</a>.
          </div>
        )}
        <h1 className="mb-3 text-3xl font-bold">Upload your contacts. Get personalized emails in minutes.</h1>
        <p className="mb-6 text-gray-700">AI generates subject & body. Review, select, and send.</p>
        <div className="flex flex-wrap items-center gap-3">
          <a href="/api/auth/signin/azure-ad?callbackUrl=%2Fupload" className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
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
          </a>
          
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="rounded-lg border bg-white p-8 shadow-sm">
        <div className="grid gap-6 sm:grid-cols-3">
          <div>
            <div className="mb-2 text-base font-semibold">Upload Excel/CSV</div>
            <p className="text-sm text-gray-600">Import contacts directly. We’ll parse the essentials for you.</p>
          </div>
          <div>
            <div className="mb-2 text-base font-semibold">Review drafts</div>
            <p className="text-sm text-gray-600">Skim and tweak subjects and bodies before sending.</p>
          </div>
          <div>
            <div className="mb-2 text-base font-semibold">Send from your mailbox</div>
            <p className="text-sm text-gray-600">We send via Microsoft Graph, so mail lands in your Sent Items.</p>
          </div>
        </div>
      </section>

      {/* FAQ mini */}
      <section className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="text-sm">
          <div className="font-medium">Will this send from my company email?</div>
          <p className="text-gray-700">Yes, via Microsoft Graph after consent. Messages are sent as you and saved to Sent Items.</p>
        </div>
      </section>
    </main>
  );
}
