import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { EmailType } from "@/types/contacts";
import OpenAI from "openai";

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user?.email || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { contacts, emailType, instructions } = body as {
    contacts: any[];
    emailType: EmailType;
    instructions?: string;
  };

  if (!contacts?.length) {
    return NextResponse.json({ error: "No contacts provided" }, { status: 400 });
  }

  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const results: any[] = [];
  for (const c of contacts) {
    const prompt = `You are an expert SDR. Write a short, personalized cold email. Style: ${emailType}. Return strict JSON with keys subject and body only.
Contact:
First Name: ${c.firstName || ""}
Last Name: ${c.lastName || ""}
Title: ${c.title || ""}
Company: ${c.accountName || ""}
City: ${c.mailingCity || ""}
Street: ${c.mailingStreet || ""}
Zip: ${c.mailingZip || ""}
Business Phone: ${c.businessPhone || ""}
Mobile: ${c.mobileNumber || ""}
Email: ${c.email}
${instructions ? `Extra instructions: ${instructions}` : ""}`;

    const resp = await openai.responses.create({
      model: "gpt-4o-mini",
      input: prompt,
    });

  const text = (resp as any).output_text || "{}";
    let json: { subject?: string; body?: string } = {};
    try {
      json = JSON.parse(text);
    } catch {
      json = { subject: "", body: text };
    }

    const draft = await prisma.draft.create({
      data: {
        userId: session.user.id,
        contactEmail: c.email,
        contactFirstName: c.firstName,
        contactLastName: c.lastName,
        contactTitle: c.title,
        accountName: c.accountName,
        mailingCity: c.mailingCity,
        mailingStreet: c.mailingStreet,
        mailingZip: c.mailingZip,
        businessPhone: c.businessPhone,
        mobileNumber: c.mobileNumber,
        emailType,
        instructions,
        subject: json.subject || "",
        body: json.body || "",
      },
    });
    results.push(draft);
  }

  return NextResponse.json({ drafts: results });
}
