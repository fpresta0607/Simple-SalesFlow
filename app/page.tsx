import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage({ searchParams }: { searchParams?: { error?: string } }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const error = searchParams?.error;
  return (
    <main className="mx-auto w-full max-w-6xl space-y-8 px-3">
      {/* Header */}
      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-8 shadow-sm soft-gradient animate-fade-in">
        <div className="relative z-10">
          <h1 className="mb-2 text-2xl font-semibold tracking-tight animate-slide-up">Welcome back</h1>
          <p className="text-gray-700 animate-slide-up-delayed">Ready to create and send more personalized emails?</p>
          <div className="mt-4 flex gap-3 animate-slide-up-delayed-2">
            <a href="/upload" className="inline-flex items-center gap-2 rounded-full bg-blue-600 px-4 py-2 text-white shadow hover:bg-blue-700 hover-pulse-subtle">Upload new list</a>
            <a href="/drafts" className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-white shadow hover:bg-slate-800">Review drafts</a>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm animate-fade-in">
        <div className="grid gap-6 sm:grid-cols-3">
          <div className="transition-transform hover:-translate-y-0.5">
            <div className="mb-2 text-base font-semibold">Upload Excel/CSV</div>
            <p className="text-sm text-gray-600">Import contacts directly. We’ll parse the essentials for you.</p>
          </div>
          <div className="transition-transform hover:-translate-y-0.5">
            <div className="mb-2 text-base font-semibold">Review drafts</div>
            <p className="text-sm text-gray-600">Skim and tweak subjects and bodies before sending.</p>
          </div>
          <div className="transition-transform hover:-translate-y-0.5">
            <div className="mb-2 text-base font-semibold">Send from your mailbox</div>
            <p className="text-sm text-gray-600">We send via Microsoft Graph, so mail lands in your Sent Items.</p>
          </div>
        </div>
      </section>

      {/* FAQ mini */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm animate-fade-in">
        <div className="text-sm">
          <div className="font-medium">Will this send from my company email?</div>
          <p className="text-gray-700">Yes, via Microsoft Graph after consent. Messages are sent as you and saved to Sent Items.</p>
        </div>
      </section>
    </main>
  );
}
