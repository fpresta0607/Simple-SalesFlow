/* eslint-disable no-console */
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const args = process.argv.slice(2);
  const isAll = args.includes("--all");
  const yes = args.includes("--yes");
  const emailArg = args.find((a) => a.includes("@"));

  if (isAll) {
    if (!yes) {
      console.log("Refusing to delete all logs without --yes. Usage: node scripts/clear-email-logs.js --all --yes");
      process.exit(1);
    }
    const res = await prisma.emailLog.deleteMany({});
    console.log(`Deleted ALL email logs: ${res.count}`);
    return;
  }

  if (!emailArg) {
    console.log("Usage:");
    console.log("  node scripts/clear-email-logs.js user@example.com");
    console.log("  node scripts/clear-email-logs.js --all --yes");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: emailArg } });
  if (!user) {
    console.log(`No user found for email: ${emailArg}`);
    return;
  }

  const res = await prisma.emailLog.deleteMany({ where: { userId: user.id } });
  console.log(`Deleted ${res.count} email logs for ${emailArg}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
