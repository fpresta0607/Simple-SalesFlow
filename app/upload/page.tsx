"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Contact } from "@/types/contacts";

export default function UploadPage() {
  const [dragOver, setDragOver] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const router = useRouter();

  async function handleFile(file: File) {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const data = await res.json();
    setContacts(data.contacts || []);
    if (data.contacts) localStorage.setItem("uploadedContacts", JSON.stringify(data.contacts));
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
    <main className="space-y-6">
      <h2 className="text-lg font-semibold">Upload your contact list</h2>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={`flex h-40 items-center justify-center rounded border-2 border-dashed ${dragOver ? "border-blue-600 bg-blue-50" : "border-gray-300"}`}
      >
        <div className="text-center">
          <p className="mb-2 text-sm text-gray-600">Drag and drop CSV/XLSX here</p>
          <label className="cursor-pointer rounded bg-blue-600 px-3 py-1 text-white">
            Browse
            <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onInput} />
          </label>
          <div className="mt-2 text-xs text-gray-600">
            <a className="underline" href="/sample-template.csv">Download sample template</a>
          </div>
        </div>
      </div>
      {contacts.length > 0 && (
        <div className="rounded border bg-white p-4">
          <div className="mb-3 text-sm text-gray-700">Parsed {contacts.length} contacts</div>
          <button
            onClick={() => router.push(`/settings?count=${contacts.length}`)}
            className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
          >
            Continue
          </button>
        </div>
      )}
    </main>
  );
}
