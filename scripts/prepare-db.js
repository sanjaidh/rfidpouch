import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config();
dotenv.config({ path: path.resolve(process.cwd(), 'server/.env') });

const schemaPath = path.resolve(process.cwd(), 'prisma/schema.prisma');
let schema = fs.readFileSync(schemaPath, 'utf8');

const dbUrl = process.env.DATABASE_URL || '';
const isPostgres = dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://');
const targetProvider = isPostgres ? 'postgresql' : 'sqlite';

console.log(`[PouchTrack DB Config] Detected DATABASE_URL target: ${targetProvider}`);

schema = schema.replace(
  /provider\s*=\s*"(sqlite|postgresql)"/,
  `provider = "${targetProvider}"`
);

fs.writeFileSync(schemaPath, schema, 'utf8');
console.log(`[PouchTrack DB Config] Successfully updated prisma/schema.prisma to provider: ${targetProvider}`);
