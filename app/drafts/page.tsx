"use client";
import { useEffect, useMemo, useState } from "react";

type Draft = {
  id: string;
  contactEmail: string;
  contactFirstName?: string;
  contactLastName?: string;
  contactTitle?: string;
  accountName?: string;
  subject: string;
  body: string;
  status: string;
};

export default function DraftsPage() {
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [removing, setRemoving] = useState(false);
  const selectedCount = drafts.reduce((acc, d) => acc + (selected[d.id] ? 1 : 0), 0);

  async function fetchDrafts() {
    try {
      const res = await fetch("/api/drafts");
      const data = await res.json();
      setDrafts(data.drafts || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchDrafts(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drafts;
    return drafts.filter((d) =>
      (d.contactFirstName || "").toLowerCase().includes(q) ||
      (d.contactLastName || "").toLowerCase().includes(q) ||
      (d.contactTitle || "").toLowerCase().includes(q) ||
      (d.accountName || "").toLowerCase().includes(q) ||
      d.contactEmail.toLowerCase().includes(q) ||
      d.subject.toLowerCase().includes(q) ||
      d.body.toLowerCase().includes(q)
    );
  }, [drafts, query]);

  function toggleAll(e: React.ChangeEvent<HTMLInputElement>) {
    const checked = e.target.checked;
    const next: Record<string, boolean> = {};
    drafts.forEach((d: Draft) => next[d.id] = checked);
    setSelected(next);
  }

  function updateDraftLocal(id: string, patch: Partial<Draft>) {
    setDrafts((ds: Draft[]) => ds.map((d: Draft) => d.id === id ? { ...d, ...patch } : d));
  }

  async function saveDraft(d: Draft) {
    await fetch(`/api/drafts/${d.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ subject: d.subject, body: d.body }) });
  }

  async function sendSelected() {
    const ids = drafts.filter((d: Draft) => selected[d.id]).map((d: Draft) => d.id);
    if (ids.length === 0) return alert("Select at least one draft");
    setSending(true);
    const res = await fetch("/api/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ draftIds: ids }) });
    const data = await res.json();
    // Clear selection and go to Sent page with summary
    setSelected({});
    try {
      // Clear contact upload cache and any legacy outlook footer keys
      localStorage.removeItem("uploadedContacts");
      localStorage.removeItem("outlookFooter");
      const fm = localStorage.getItem("footerMode");
      if (fm === "outlook") localStorage.setItem("footerMode", "none");
    } catch {}
    const encoded = encodeURIComponent(JSON.stringify(data.results || []));
    window.location.href = `/sent?results=${encoded}`;
  }

  function clearSendList() {
    setSelected({});
  }

  async function removeFromSendList(id: string) {
    // If draft is selected, deselect; also delete the draft from server and local list
    setSelected((s) => {
      const next = { ...s };
      if (next[id]) delete next[id];
      return next;
    });
    try {
      const res = await fetch(`/api/drafts/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const t = await res.text();
        alert(`Failed to delete draft: ${t}`);
        return;
      }
      setDrafts((ds) => ds.filter((d) => d.id !== id));
    } catch (e: any) {
      alert(`Failed to delete draft: ${e?.message || e}`);
    }
  }

  async function removeAllSelected() {
    const ids = drafts.filter((d: Draft) => selected[d.id]).map((d: Draft) => d.id);
    if (ids.length === 0) return alert("Select at least one draft to remove");
    setRemoving(true);
    const failed: string[] = [];
    try {
      for (const id of ids) {
        try {
          const res = await fetch(`/api/drafts/${id}`, { method: "DELETE" });
          if (!res.ok) failed.push(id);
        } catch {
          failed.push(id);
        }
      }
      const success = new Set(ids.filter((id) => !failed.includes(id)));
      if (success.size > 0) {
        setDrafts((ds) => ds.filter((d) => !success.has(d.id)));
        setSelected((s) => {
          const next = { ...s } as Record<string, boolean>;
          for (const id of success) delete next[id];
          return next;
        });
      }
      if (failed.length > 0) {
        alert(`Failed to delete ${failed.length} draft(s). Please retry.`);
      }
    } finally {
      setRemoving(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-none space-y-4 px-1 pb-6 lg:px-2">
      <h2 className="pt-2 text-xl font-semibold tracking-tight">Review drafts</h2>
      <p className="text-sm text-slate-500">Generated drafts. Edit before sending.</p>

      {/* Toolbar */}
  <div className="sticky top-14 z-10 -mx-1 mb-2 bg-[#f5f5f7]/80 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-[#f5f5f7]/60 lg:-mx-2 lg:px-2">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="search"
              placeholder="Search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-full border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-blue-500"
            />
          </div>
          <button onClick={() => {
            // Select all visible
            const next: Record<string, boolean> = {};
            filtered.forEach((d) => { next[d.id] = true; });
            setSelected(next);
          }} className="rounded-full bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow active:scale-[.98]">Select All</button>
          <button onClick={clearSendList} className="rounded-full bg-slate-200 px-3 py-2 text-xs font-medium text-slate-900 shadow active:scale-[.98]">Clear</button>
          <button disabled={removing} onClick={removeAllSelected} className={`rounded-full px-3 py-2 text-xs font-medium text-white shadow active:scale-[.98] ${removing ? "bg-red-400" : "bg-red-600 hover:bg-red-700"}`}>
            {removing ? "Removing…" : `Remove ${selectedCount > 0 ? `${selectedCount} Selected` : "Selected"}`}
          </button>
          <button disabled={sending} onClick={sendSelected} className={`rounded-full px-3 py-2 text-xs font-medium text-white shadow active:scale-[.98] ${sending ? "bg-blue-400" : "bg-blue-600"}`}>
            {sending ? "Sending…" : `Send ${selectedCount > 0 ? `${selectedCount} Selected` : "Selected"}`}
          </button>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {loading && (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-2xl border border-slate-200 bg-white/60 p-3 shadow-sm">
                <div className="h-4 w-1/3 rounded bg-slate-200"/>
                <div className="mt-2 h-3 w-1/2 rounded bg-slate-200"/>
                <div className="mt-4 h-16 rounded bg-slate-100"/>
              </div>
            ))}
          </div>
        )}
        {filtered.map((d) => {
          const checked = !!selected[d.id];
          const name = [d.contactFirstName, d.contactLastName].filter(Boolean).join(" ");
          return (
            <div key={d.id} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setSelected((s) => ({ ...s, [d.id]: e.target.checked }))}
                  className="mt-1 h-5 w-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  aria-label={`Select ${d.contactEmail}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold leading-5">{name || d.contactEmail}</div>
                      <div className="truncate text-xs text-slate-500">{[d.contactTitle, d.accountName].filter(Boolean).join(" · ")}</div>
                    </div>
                    <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 capitalize">{d.status}</span>
                  </div>

                  <div className="mt-2">
                    <input
                      value={d.subject}
                      onChange={(e) => updateDraftLocal(d.id, { subject: e.target.value })}
                      className="w-full truncate rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[15px] font-medium focus:border-blue-500 focus:bg-white"
                      aria-label="Subject"
                    />
                    <textarea
                      value={d.body}
                      onChange={(e) => updateDraftLocal(d.id, { body: e.target.value })}
                      className="mt-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm leading-5 text-slate-700 focus:border-blue-500 focus:bg-white"
                      rows={4}
                      aria-label="Body"
                    />
                  </div>

                  <div className="mt-2 flex items-center gap-2">
                    <button onClick={() => saveDraft(d)} className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white shadow active:scale-[.98]">Save</button>
                    <button onClick={() => removeFromSendList(d.id)} className="rounded-full bg-amber-600 px-3 py-1.5 text-xs font-medium text-white shadow active:scale-[.98]">Remove</button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
