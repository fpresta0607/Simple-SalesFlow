#!/usr/bin/env node
/*
  Delete a user and related records by email.
  Usage:
    powershell> node scripts/clear-user.js user@example.com
    powershell> npm run prisma:clear-user -- user@example.com
*/

const { PrismaClient } = require("@prisma/client");

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: node scripts/clear-user.js <email>");
    process.exit(1);
  }
  const prisma = new PrismaClient();
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log(`No user found for email: ${email}`);
      return;
    }

    // Delete related data first where onDelete is not Cascade
    await prisma.emailLog.deleteMany({ where: { userId: user.id } });
    await prisma.draft.deleteMany({ where: { userId: user.id } });
    await prisma.session.deleteMany({ where: { userId: user.id } });
    await prisma.account.deleteMany({ where: { userId: user.id } });

    // Finally delete the user
    await prisma.user.delete({ where: { id: user.id } });
    console.log(`Deleted user ${email} and related records.`);
  } catch (e) {
    console.error("Error:", e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
