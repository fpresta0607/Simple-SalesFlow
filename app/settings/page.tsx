"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EmailType } from "@/types/contacts";

export default function SettingsPage() {
  const [emailType, setEmailType] = useState<EmailType>("Direct");
  const [instructions, setInstructions] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("uploadedContacts");
    if (stored) setContacts(JSON.parse(stored));
  }, []);

  async function handleGenerate() {
    if (!contacts.length) return alert("No contacts parsed. Go back to upload.");
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contacts, emailType, instructions }),
    });
    const data = await res.json();
    if (data.error) return alert(data.error);
    router.push("/drafts");
  }

  return (
    <main className="space-y-6">
      <h2 className="text-lg font-semibold">Email settings</h2>
      <div className="space-y-4 rounded border bg-white p-4">
        <div>
          <label htmlFor="emailType" className="mb-1 block text-sm font-medium">Email Type</label>
          <select
            id="emailType"
            value={emailType}
            onChange={(e) => setEmailType(e.target.value as EmailType)}
            className="w-full rounded border px-3 py-2"
          >
            <option>Direct</option>
            <option>Consultative</option>
            <option>Friendly</option>
          </select>
        </div>
        <div>
          <label htmlFor="instructions" className="mb-1 block text-sm font-medium">Custom instructions (optional)</label>
          <textarea
            id="instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={5}
            className="w-full rounded border px-3 py-2"
            placeholder="Add context, value props, or CTA preferences"
          />
        </div>
        <button onClick={handleGenerate} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Generate drafts
        </button>
      </div>
    </main>
  );
}
