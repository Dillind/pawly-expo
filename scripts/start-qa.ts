import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';

// The qa build profile is the one source of the QA project's values.
const eas = JSON.parse(readFileSync('eas.json', 'utf8'));
const qaEnv: Record<string, string> = eas.build.qa.env;

// --clear, or Metro can serve a bundle built with the other project's values.
const child = spawn('bunx', ['expo', 'start', '--clear', ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: { ...process.env, ...qaEnv }
});

child.on('exit', (code) => process.exit(code ?? 0));
