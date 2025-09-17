"use client";
import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function SentPage() {
  const params = useSearchParams();
  const router = useRouter();
  const resultsParam = params.get("results");
  const results = useMemo(() => {
    try { return resultsParam ? JSON.parse(resultsParam) : []; } catch { return []; }
  }, [resultsParam]);
  const counts = useMemo(() => {
    const c = { sent: 0, failed: 0, skipped: 0 } as Record<string, number>;
    for (const r of results) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [results]);

  useEffect(() => {
    if (!resultsParam) {
      // if navigated directly, go back to drafts
      router.replace("/drafts");
    }
  }, [resultsParam, router]);

  return (
    <main className="mx-auto w-full max-w-5xl space-y-6 px-3">
      <h2 className="text-xl font-semibold tracking-tight">Send complete</h2>
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="space-y-1">
          <div><span className="font-medium">Sent:</span> {counts.sent || 0}</div>
          <div><span className="font-medium">Skipped:</span> {counts.skipped || 0}</div>
          <div><span className="font-medium">Failed:</span> {counts.failed || 0}</div>
        </div>
      </div>
      {Array.isArray(results) && results.length > 0 && (
        <div className="overflow-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-left">Last emailed</th>
                <th className="p-3 text-left">Error</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r: any) => (
                <tr key={r.id} className="border-t">
                  <td className="p-3 align-top">{r.name || "—"}</td>
                  <td className="p-3 align-top">{r.email || "—"}</td>
                  <td className="p-3 align-top">{r.status}</td>
                  <td className="p-3 align-top">{r.lastEmailedAt ? new Date(r.lastEmailedAt).toLocaleString() : "—"}</td>
                  <td className="p-3 align-top text-red-600">{r.error || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="space-x-2">
        <button onClick={() => router.push("/upload")} className="rounded-full bg-gray-800 px-3 py-1.5 text-white shadow">Upload more contacts</button>
        <button onClick={() => router.push("/drafts")} className="rounded-full bg-gray-600 px-3 py-1.5 text-white shadow">Back to drafts</button>
      </div>
    </main>
  );
}
