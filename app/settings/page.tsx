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
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });
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

  // Guard against leaving during generation
  useEffect(() => {
    function remainingCount() {
      return Math.max(0, (progress?.total || 0) - (progress?.current || 0));
    }
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (generating && remainingCount() > 0) {
        e.preventDefault();
        // Some browsers require returnValue to be set
        e.returnValue = "";
      }
    };
    const clickGuard = (e: Event) => {
      if (!generating) return;
      const remain = remainingCount();
      if (remain <= 0) return;
      // Intercept anchor clicks (header nav, links, etc.)
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest ? (target.closest("a") as HTMLAnchorElement | null) : null;
      if (!anchor) return;
      // Ignore new-tab or in-page anchors
      if (anchor.target && anchor.target.toLowerCase() === "_blank") return;
      if (anchor.href && anchor.href.startsWith("#")) return;
      // Only guard same-origin navigations
      try {
        const url = new URL(anchor.href, window.location.href);
        if (url.origin !== window.location.origin) return;
      } catch {
        // if parsing fails, let it go
        return;
      }
      const ok = window.confirm(`Generation in progress. You still have ${remain} contact(s) left without drafts. Are you sure you want to leave?`);
      if (!ok) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", clickGuard, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", clickGuard, true);
    };
  }, [generating, progress]);

  async function handleGenerate() {
    if (!contacts.length) return alert("No contacts parsed. Go back to upload.");
    setGenerating(true);
    setProgress({ current: 0, total: contacts.length });
    const footer = footerMode === "custom" ? customFooter : "";
    try {
      // process one-by-one to provide simple progress updates
      for (let i = 0; i < contacts.length; i++) {
        const c = contacts[i];
        const res = await fetch("/api/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contacts: [c], emailType, instructions, footer }),
        });
        if (!res.ok) {
          // non-fatal: continue but notify user
          const text = await res.text();
          console.warn("Generate failed for", c.email, text);
        }
        setProgress({ current: i + 1, total: contacts.length });
      }
      router.push("/drafts");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl space-y-6 px-3">
      <h2 className="text-xl font-semibold tracking-tight">Email settings</h2>
      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div>
          <label htmlFor="emailType" className="mb-1 block text-sm font-medium">Email Type</label>
          <select
            id="emailType"
            value={emailType}
            onChange={(e) => setEmailType(e.target.value as EmailType)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
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
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                placeholder={"e.g.\nBest,\nFranco Presta\nFounder | SIQStack\n630-555-1234"}
              />
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button disabled={generating} onClick={handleGenerate} className={`rounded-full px-4 py-2 text-white shadow ${generating ? "bg-blue-400" : "bg-blue-600 hover:bg-blue-700"}`}>
            {generating ? "Generating…" : "Generate drafts"}
          </button>
          {generating && (
            <div className="flex items-center gap-3">
              <progress
                className="w-48 h-2 [&::-webkit-progress-bar]:bg-slate-200 [&::-webkit-progress-value]:bg-blue-600 rounded-full overflow-hidden"
                value={progress.current}
                max={progress.total || 1}
              />
              <div className="text-xs text-slate-600">
                {progress.current}/{progress.total}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
