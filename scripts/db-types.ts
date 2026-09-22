import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

const PROJECT_ID = 'dofjrttcyjtzvqyttqdo';
const OUT = 'src/types/database.ts';

const generated = execSync(
  `bunx supabase gen types typescript --project-id ${PROJECT_ID} --schema public`,
  { encoding: 'utf8' }
);

// `bunx supabase gen types` cannot express a nullable function argument, and every one here is.
const lines = generated.split('\n');
let inArgs = false;
const patched = lines.map((line) => {
  const inline = line.match(/^(\s+Args: \{ )(.+)( \};?)$/);
  if (inline) {
    const members = inline[2].split('; ').map((member) => `${member.replace(/;$/, '')} | null`);
    return `${inline[1]}${members.join('; ')}${inline[3]}`;
  }
  if (/^\s+Args: \{$/.test(line)) inArgs = true;
  else if (inArgs && /^\s+\};?$/.test(line)) inArgs = false;
  else if (inArgs) return line.replace(/^(\s+\w+\??: )([^;]+);?$/, '$1$2 | null');
  return line;
});

writeFileSync(OUT, patched.join('\n'));
execSync(`bunx prettier --write ${OUT}`);
