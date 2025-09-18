/*
  Seed SentEmailLog entries from existing GLOBAL suppressions.

  - Associates each suppression email with user 'franco@siqstack.com'
  - Uses subject 'Seeded from suppression'
  - Sets createdAt to now
  - Idempotent: skips if a log for (userId, toEmail, subject) already exists
*/

/* eslint-disable no-console */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const targetEmail = process.env.SEED_LOGS_USER_EMAIL || "franco@siqstack.com";
  const subject = process.env.SEED_LOGS_SUBJECT || "Seeded from suppression";
  const now = new Date();

  console.log("Seeding SentEmailLog from GLOBAL suppressions...");

  // Ensure user exists
  let user = await prisma.user.findUnique({ where: { email: targetEmail } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: targetEmail, name: targetEmail.split("@")[0] },
    });
    console.log(`Created user ${targetEmail} with id ${user.id}`);
  } else {
    console.log(`Using existing user ${targetEmail} with id ${user.id}`);
  }

  // Fetch all GLOBAL suppressions (key 'global' to match our CSV import convention)
  const suppressions = await prisma.suppression.findMany({
    where: { scope: "global", key: "global" },
    select: { email: true },
  });

  const uniqueEmails = Array.from(
    new Set(suppressions.map((s) => (s.email || "").trim().toLowerCase()).filter(Boolean))
  );
  console.log(`Found ${uniqueEmails.length} unique global suppression emails.`);

  if (uniqueEmails.length === 0) {
    console.log("Nothing to seed. Exiting.");
    return;
  }

  // Find existing logs to keep operation idempotent
  const existing = await prisma.sentEmailLog.findMany({
    where: { userId: user.id, subject, toEmail: { in: uniqueEmails } },
    select: { toEmail: true },
  });
  const existingSet = new Set(existing.map((e) => e.toEmail.toLowerCase()));

  const toInsert = uniqueEmails.filter((e) => !existingSet.has(e));
  console.log(
    `Skipping ${uniqueEmails.length - toInsert.length} existing; inserting ${toInsert.length} new logs.`
  );

  if (toInsert.length === 0) {
    console.log("All logs already exist. Done.");
    return;
  }

  // Batch insert to avoid oversized payloads (though 125 is fine)
  const batchSize = 1000;
  let created = 0;
  for (let i = 0; i < toInsert.length; i += batchSize) {
    const batch = toInsert.slice(i, i + batchSize);
    const data = batch.map((email) => ({
      userId: user.id,
      toEmail: email,
      subject,
      createdAt: now,
    }));
    const res = await prisma.sentEmailLog.createMany({ data });
    created += res.count || data.length; // older Prisma may not return count
  }

  console.log(`Inserted ${created} SentEmailLog rows.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
