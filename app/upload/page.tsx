"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Contact } from "@/types/contacts";

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [parsing, setParsing] = useState(false);
  const router = useRouter();

  async function handleFile(file: File) {
    setParsing(true);
    const form = new FormData();
    form.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      setContacts(data.contacts || []);
      if (data.contacts) localStorage.setItem("uploadedContacts", JSON.stringify(data.contacts));
    } finally {
      setParsing(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function onInput(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-6 px-3">
      <h2 className="text-xl font-semibold tracking-tight">Upload your contact list</h2>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex h-44 items-center justify-center rounded-2xl border-2 border-dashed bg-white shadow-sm transition ${dragOver ? "border-blue-600 bg-blue-50" : "border-slate-200"}`}
      >
        <div className="text-center">
          <p className="mb-2 text-sm text-gray-600">Drag and drop CSV/XLSX here</p>
          <label className="cursor-pointer rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow">
            Browse
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onInput} />
          </label>
          <div className="mt-2 text-xs text-gray-600">
            <a className="underline" href="/sample-template.csv">Download sample template</a>
          </div>
          {parsing && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-slate-500"/>
              Parsing file…
            </div>
          )}
        </div>
      </div>
      {contacts.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-sm text-gray-700">Parsed {contacts.length} contacts</div>
          <button
            onClick={() => router.push(`/settings?count=${contacts.length}`)}
            className="rounded-full bg-green-600 px-4 py-2 text-white shadow hover:bg-green-700"
          >
            Continue
          </button>
        </div>
      )}
    </main>
  );
}
