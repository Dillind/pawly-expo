import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

import { makeRpcArgsNullable } from './db-types-patch';

const PROJECT_ID = 'dofjrttcyjtzvqyttqdo';
const OUT = 'src/types/database.ts';

// --local reads the database that `supabase db start` built from supabase/migrations.
const source = process.argv.includes('--local') ? '--local' : `--project-id ${PROJECT_ID}`;

const generated = execSync(`bunx supabase gen types typescript ${source} --schema public`, {
  encoding: 'utf8'
});

writeFileSync(OUT, makeRpcArgsNullable(generated));
execSync(`bunx prettier --write ${OUT}`);
