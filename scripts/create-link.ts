import { generateCode, shareUrl } from "../src/lib/codes";
import { db } from "../src/lib/db";

async function main() {
  const label = process.argv[2];
  const days = Number(process.argv[3] ?? 7);
  if (!label) {
    console.error('Usage: npm run link:create -- "Company name" [days]');
    process.exit(1);
  }
  const code = generateCode();
  await db.accessLink.create({ data: { code, label, expiresAt: new Date(Date.now() + days * 86_400_000) } });
  console.log(`${code}\n${shareUrl(code)}`);
  await db.$disconnect();
}

main();
