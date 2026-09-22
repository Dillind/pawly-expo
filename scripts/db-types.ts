import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

import { makeRpcArgsNullable } from './db-types-patch';

const PROJECT_ID = 'dofjrttcyjtzvqyttqdo';
const OUT = 'src/types/database.ts';

const generated = execSync(
  `bunx supabase gen types typescript --project-id ${PROJECT_ID} --schema public`,
  { encoding: 'utf8' }
);

writeFileSync(OUT, makeRpcArgsNullable(generated));
execSync(`bunx prettier --write ${OUT}`);
