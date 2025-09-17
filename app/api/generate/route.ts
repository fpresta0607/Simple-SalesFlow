import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { EmailType } from "@/types/contacts";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session?.user?.email || !session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { contacts, emailType, instructions, footer } = body as {
      contacts: any[];
      emailType: EmailType;
      instructions?: string;
      footer?: string;
    };

    if (!contacts?.length) {
      return NextResponse.json({ error: "No contacts provided" }, { status: 400 });
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const toStrOrUndef = (v: any): string | undefined => {
      if (v === null || v === undefined) return undefined;
      const s = String(v).trim();
      return s.length ? s : undefined;
    };

    function tryParseJsonBlock(text: string): { subject?: string; body?: string } | null {
      if (!text) return null;
      // Try direct JSON
      try { return JSON.parse(text); } catch {}
      // Try code-fenced JSON
      const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
      if (fence && fence[1]) {
        try { return JSON.parse(fence[1]); } catch {}
      }
      // Try to find a JSON object substring
      const braceStart = text.indexOf("{");
      const braceEnd = text.lastIndexOf("}");
      if (braceStart !== -1 && braceEnd !== -1 && braceEnd > braceStart) {
        const slice = text.slice(braceStart, braceEnd + 1);
        try { return JSON.parse(slice); } catch {}
      }
      return null;
    }

    function deriveSubjectFromBody(body: string | undefined): string {
      if (!body) return "Quick note";
      const clean = body.replace(/```[\s\S]*?```/g, "").trim();
      const lines = clean.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      let first = lines[0] || clean.slice(0, 140);
      // Remove leading Subject: if present
      first = first.replace(/^subject:\s*/i, "");
      // Clamp length
      if (first.length > 120) first = first.slice(0, 117).trimEnd() + "...";
      if (!first) first = "Quick note";
      return first;
    }

    // Remove any signature/sign-off the model might add; we append our own footer later
    function stripSignature(text: string): string {
      if (!text) return text;
      const normalized = text.replace(/\r\n/g, "\n");
      const lines = normalized.split("\n");
      const signoff = /^(best(?: regards| wishes)?|regards|kind regards|thanks|thank you|sincerely|cheers|warmly|all the best|many thanks)\b[\s,!.]*$/i;
      const divider = /^[-–—]{2,}\s*$/;
      let cutAt = -1;
      // Look back up to last 8 lines for a sign-off starter or divider
      for (let i = lines.length - 1; i >= Math.max(0, lines.length - 8); i--) {
        const l = lines[i].trim();
        if (!l) continue; // allow trailing blanks
        if (divider.test(l) || signoff.test(l)) {
          cutAt = i;
          break;
        }
      }
      const kept = cutAt >= 0 ? lines.slice(0, cutAt) : lines;
      // Trim trailing blank lines
      while (kept.length && kept[kept.length - 1].trim() === "") kept.pop();
      return kept.join("\n");
    }

    const results: any[] = [];
    for (const c of contacts) {
      const prompt = `You are an expert SDR. Write a short, natural-sounding cold email designed to start a conversation and book a sales call.
      Make it professional, warm, and tailored to the person’s role and the company’s likely needs.
      Focus on referencing the company or industry context instead of being generic.

      Style: ${emailType}.
      Important: Do NOT include any footer or signature in the body. Do not add lines like "Best regards", "Sincerely", names, titles, phone numbers, or email addresses. Our app will append a footer/signature automatically.
      Only include the greeting and the message content/CTA; end the email without any sign-off block.
      Return a strict single-line JSON object ONLY, no code fences, no extra text. Keys: subject, body.
      Example: {"subject":"...","body":"..."}
      Contact:
First Name: ${toStrOrUndef(c.firstName) || ""}
Last Name: ${toStrOrUndef(c.lastName) || ""}
Title: ${toStrOrUndef(c.title) || ""}
Company: ${toStrOrUndef(c.accountName) || ""}
City: ${toStrOrUndef(c.mailingCity) || ""}
Street: ${toStrOrUndef(c.mailingStreet) || ""}
Zip: ${toStrOrUndef(c.mailingZip) || ""}
Business Phone: ${toStrOrUndef(c.businessPhone) || ""}
Mobile: ${toStrOrUndef(c.mobileNumber) || ""}
Email: ${c.email}
${instructions ? `Extra instructions: ${instructions}` : ""}`;
      try {
        const resp = await openai.responses.create({
          model: "gpt-4o-mini",
          input: prompt,
        });

        const text = (resp as any).output_text || "{}";
  let json = tryParseJsonBlock(text) || { subject: "", body: text };
  const cleanedBody = stripSignature(json.body || "");
  if (!json.subject) json.subject = deriveSubjectFromBody(cleanedBody);

        // Append footer if provided; if it looks like HTML (<...>), keep as-is; otherwise append as plain text separated by two newlines.
        const withFooter = (content: string) => {
          if (!footer) return content;
          const isHtml = /<[^>]+>/.test(footer);
          if (isHtml) {
            // Wrap body as HTML; if body seems plain text, convert newlines to <br/>
            const bodyLooksHtml = /<[^>]+>/.test(content);
            const htmlBody = bodyLooksHtml ? content : content.replace(/\n/g, "<br/>");
            return `${htmlBody}<br/><br/>${footer}`;
          } else {
            return `${content}\n\n${footer}`;
          }
        };

        const draft = await prisma.draft.create({
          data: {
            userId: session.user.id,
            contactEmail: c.email,
            contactFirstName: toStrOrUndef(c.firstName),
            contactLastName: toStrOrUndef(c.lastName),
            contactTitle: toStrOrUndef(c.title),
            accountName: toStrOrUndef(c.accountName),
            mailingCity: toStrOrUndef(c.mailingCity),
            mailingStreet: toStrOrUndef(c.mailingStreet),
            mailingZip: toStrOrUndef(c.mailingZip),
            businessPhone: toStrOrUndef(c.businessPhone),
            mobileNumber: toStrOrUndef(c.mobileNumber),
            emailType,
            instructions,
            subject: json.subject || deriveSubjectFromBody(cleanedBody),
            body: withFooter(cleanedBody),
          },
        });
        results.push(draft);
      } catch (err: any) {
        // If generation fails for this contact, create a placeholder draft with error status
        const draft = await prisma.draft.create({
          data: {
            userId: session.user.id,
            contactEmail: c.email,
            contactFirstName: toStrOrUndef(c.firstName),
            contactLastName: toStrOrUndef(c.lastName),
            contactTitle: toStrOrUndef(c.title),
            accountName: toStrOrUndef(c.accountName),
            mailingCity: toStrOrUndef(c.mailingCity),
            mailingStreet: toStrOrUndef(c.mailingStreet),
            mailingZip: toStrOrUndef(c.mailingZip),
            businessPhone: toStrOrUndef(c.businessPhone),
            mobileNumber: toStrOrUndef(c.mobileNumber),
            emailType,
            instructions,
            subject: "",
            body: `Generation failed: ${err?.message || "unknown error"}`,
            status: "failed",
          },
        });
        results.push(draft);
      }
    }

    return NextResponse.json({ drafts: results });
  } catch (e: any) {
    console.error("/api/generate error", e);
    return NextResponse.json({ error: e?.message || "Internal server error" }, { status: 500 });
  }
}
