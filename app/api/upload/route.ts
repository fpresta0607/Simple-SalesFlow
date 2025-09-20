import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { Contact } from "@/types/contacts";
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth.config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normalizeHeader(h: string) {
  return h.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  // Require an authenticated session for uploads
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: "array" });
  const firstSheet = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheet];
  const rows: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

  const contacts: Contact[] = rows.map((r) => {
    const obj: Record<string, any> = {};
    for (const k of Object.keys(r)) {
      obj[normalizeHeader(k)] = r[k];
    }
    return {
      firstName: obj["first name"] || obj["firstname"] || obj["first_name"],
      lastName: obj["last name"] || obj["lastname"] || obj["last_name"],
      title: obj["title"],
      accountName: obj["account name"] || obj["company"] || obj["account"],
      email: (obj["email"] || obj["email address"] || obj["emailaddress"] || "").toString(),
      mailingCity: obj["mailing city"] || obj["city"],
      mailingStreet: obj["mailing street"] || obj["street"],
      mailingZip: (obj["mailing zip/postal code"] || obj["zip"] || obj["postal code"])?.toString(),
      businessPhone: (obj["business phone"] || obj["phone"])?.toString(),
      mobileNumber: (obj["mobile number"] || obj["mobile"])?.toString(),
    } as Contact;
  }).filter((c) => c.email);

  return NextResponse.json({ contacts });
}
