"use client";
import { useEffect, useState } from "react";

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
  const selectedCount = drafts.reduce((acc, d) => acc + (selected[d.id] ? 1 : 0), 0);

  async function fetchDrafts() {
    const res = await fetch("/api/drafts");
    const data = await res.json();
    setDrafts(data.drafts || []);
  }

  useEffect(() => { fetchDrafts(); }, []);

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

  return (
    <main className="space-y-6">
      <h2 className="text-lg font-semibold">Review drafts</h2>
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">Selected: <span className="font-medium">{selectedCount}</span></div>
        <div className="space-x-2">
          <button onClick={clearSendList} className="rounded bg-red-600 px-3 py-1.5 text-white hover:bg-red-700">Clear Send List</button>
        </div>
      </div>
      <div className="overflow-auto rounded border bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2">
                <label className="sr-only" htmlFor="selectAll">Select All</label>
                <input id="selectAll" aria-label="Select All" type="checkbox" onChange={toggleAll} />
              </th>
              <th className="p-2 text-left">Contact Name</th>
              <th className="p-2 text-left">Title</th>
              <th className="p-2 text-left">Company</th>
              <th className="p-2 text-left">Subject</th>
              <th className="p-2 text-left">Body</th>
              <th className="p-2 text-left">Status</th>
              <th className="p-2 text-left">Save</th>
              <th className="p-2 text-left">Remove</th>
            </tr>
          </thead>
          <tbody>
            {drafts.map((d: Draft) => (
              <tr key={d.id} className="border-t">
                <td className="p-2 align-top">
                  <label className="sr-only" htmlFor={`sel-${d.id}`}>Select</label>
                  <input id={`sel-${d.id}`} aria-label={`Select ${d.contactEmail}`} type="checkbox" checked={!!selected[d.id]} onChange={(e) => setSelected((s: Record<string, boolean>) => ({ ...s, [d.id]: e.target.checked }))} />
                </td>
                <td className="p-2 align-top">{d.contactFirstName} {d.contactLastName}<div className="text-xs text-gray-500">{d.contactEmail}</div></td>
                <td className="p-2 align-top">{d.contactTitle}</td>
                <td className="p-2 align-top">{d.accountName}</td>
                <td className="p-2 align-top w-64">
                  <label className="sr-only" htmlFor={`sub-${d.id}`}>Subject</label>
                  <input id={`sub-${d.id}`} aria-label="Subject" value={d.subject} onChange={(e) => updateDraftLocal(d.id, { subject: e.target.value })} className="w-full rounded border px-2 py-1" />
                </td>
                <td className="p-2 align-top w-[40rem]">
                  <label className="sr-only" htmlFor={`body-${d.id}`}>Body</label>
                  <textarea id={`body-${d.id}`} aria-label="Body" value={d.body} onChange={(e) => updateDraftLocal(d.id, { body: e.target.value })} className="h-32 w-full rounded border px-2 py-1" />
                </td>
                <td className="p-2 align-top">{d.status}</td>
                <td className="p-2 align-top"><button onClick={() => saveDraft(d)} className="rounded bg-gray-800 px-3 py-1 text-white">Save</button></td>
                <td className="p-2 align-top"><button onClick={() => removeFromSendList(d.id)} className="rounded bg-amber-600 px-3 py-1 text-white hover:bg-amber-700">Remove</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <button onClick={sendSelected} className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700">Send Selected</button>
    </main>
  );
}
