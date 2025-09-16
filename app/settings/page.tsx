"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { EmailType } from "@/types/contacts";
// removed incremental consent button; Mail.Send requested at login

export default function SettingsPage() {
  const [emailType, setEmailType] = useState<EmailType>("Direct");
  const [instructions, setInstructions] = useState("");
  const [footerMode, setFooterMode] = useState<"none" | "custom">("none");
  const [customFooter, setCustomFooter] = useState("");
  const [contacts, setContacts] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const stored = localStorage.getItem("uploadedContacts");
    if (stored) setContacts(JSON.parse(stored));
    const sFooterMode = localStorage.getItem("footerMode");
    const sCustomFooter = localStorage.getItem("customFooter");
    if (sFooterMode === "none" || sFooterMode === "custom") setFooterMode(sFooterMode);
    if (sCustomFooter) setCustomFooter(sCustomFooter);
  }, []);

  useEffect(() => {
    localStorage.setItem("footerMode", footerMode);
  }, [footerMode]);
  useEffect(() => {
    localStorage.setItem("customFooter", customFooter);
  }, [customFooter]);
  // no-op: outlook signature removed

  // Removed Outlook signature import

  async function handleGenerate() {
    if (!contacts.length) return alert("No contacts parsed. Go back to upload.");
  const footer = footerMode === "custom" ? customFooter : "";
    const res = await fetch("/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contacts, emailType, instructions, footer }),
    });
    if (!res.ok) {
      const text = await res.text();
      return alert(text || "Failed to generate drafts");
    }
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      return alert("Failed to parse response from server");
    }
    if (data?.error) return alert(data.error);
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
        <div className="space-y-2">
          <div className="text-sm font-medium">Footer options</div>
          <div className="space-y-2">
            <label className="flex items-center gap-2">
              <input type="radio" name="footerMode" value="none" checked={footerMode === "none"} onChange={() => setFooterMode("none")} />
              <span>None</span>
            </label>
            <label className="flex items-center gap-2">
              <input type="radio" name="footerMode" value="custom" checked={footerMode === "custom"} onChange={() => setFooterMode("custom")} />
              <span>Custom</span>
            </label>
            {footerMode === "custom" && (
              <textarea
                value={customFooter}
                onChange={(e) => setCustomFooter(e.target.value)}
                rows={4}
                className="w-full rounded border px-3 py-2"
                placeholder={"e.g.\nBest,\nFranco Presta\nFounder | SIQStack\n630-555-1234"}
              />
            )}
          </div>
        </div>
        <button onClick={handleGenerate} className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
          Generate drafts
        </button>
      </div>
    </main>
  );
}
