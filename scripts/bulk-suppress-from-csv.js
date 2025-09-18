#!/usr/bin/env node
/*
  Bulk add global suppressions from a CSV.
  Usage:
    node scripts/bulk-suppress-from-csv.js <path-to-csv> [--days 30] [--permanent] [--reason admin]

  Notes:
  - Reads columns: Email, Secondary Email, Tertiary Email (case-insensitive match by header).
  - Creates/upserts Suppression rows with scope="global", key="global", email=<lowercased>.
  - If --permanent is set, expiresAt = null; otherwise uses --days (default 30).
*/
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { parse } = require('csv-parse/sync');

const prisma = new PrismaClient();

function parseArgs(argv) {
  const args = { days: 30, permanent: false, reason: 'admin' };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!args.csv && !a.startsWith('--')) {
      args.csv = a;
    } else if (a === '--permanent') {
      args.permanent = true;
    } else if (a === '--days') {
      const v = Number(argv[i + 1]);
      if (!Number.isNaN(v)) args.days = v;
      i++;
    } else if (a === '--reason') {
      args.reason = String(argv[i + 1] || 'admin');
      i++;
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  if (!args.csv) {
    console.error('Usage: node scripts/bulk-suppress-from-csv.js <path-to-csv> [--days 30] [--permanent] [--reason admin]');
    process.exit(1);
  }
  const csvPath = path.resolve(args.csv);
  if (!fs.existsSync(csvPath)) {
    console.error('CSV not found:', csvPath);
    process.exit(1);
  }
  const raw = fs.readFileSync(csvPath, 'utf8');
  const records = parse(raw, {
    columns: true,
    skip_empty_lines: true,
  });

  const pick = (obj, keys) => {
    for (const k of keys) {
      const hit = Object.keys(obj).find((h) => h.toLowerCase() === k.toLowerCase());
      if (hit) return obj[hit];
    }
    return undefined;
  };

  const emails = new Set();
  for (const r of records) {
    const e1 = String(pick(r, ['Email']) || '').trim();
    const e2 = String(pick(r, ['Secondary Email']) || '').trim();
    const e3 = String(pick(r, ['Tertiary Email']) || '').trim();
    [e1, e2, e3]
      .filter(Boolean)
      .forEach((e) => {
        const v = e.toLowerCase();
        if (v.includes('@')) emails.add(v);
      });
  }

  const list = Array.from(emails);
  console.log(`Parsed ${records.length} rows, ${list.length} unique emails.`);
  const expiresAt = args.permanent ? null : new Date(Date.now() + args.days * 24 * 60 * 60 * 1000);
  let upserts = 0;
  for (const email of list) {
    try {
      await prisma.suppression.upsert({
        where: { scope_key_email: { scope: 'global', key: 'global', email } },
        update: { reason: args.reason, expiresAt },
        create: { scope: 'global', key: 'global', email, reason: args.reason, expiresAt },
      });
      upserts++;
    } catch (e) {
      console.error('Failed upsert for', email, e?.message || e);
    }
  }
  console.log(`Upserted ${upserts} suppression rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
