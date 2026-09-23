import { RuleTester, type Rule } from 'eslint';

import rule from '../../eslint-rules/comment-discipline';

const tester = new RuleTester({ languageOptions: { ecmaVersion: 2022, sourceType: 'module' } });

tester.run('comment-discipline', rule as Rule.RuleModule, {
  valid: [
    '// one\n// two\n// three\nconst a = 1;',
    'const a = 1; // first\nconst b = 2; // second\nconst c = 3; // third\nconst d = 4; // fourth',
    '// TODO(CRU-123): tracked\nconst a = 1;',
    '// eslint-disable-next-line no-console\nconsole.log(1);'
  ],
  invalid: [
    { code: '// one\n// two\n// three\n// four\nconst a = 1;', errors: 1 },
    { code: '/**\n * Doc.\n */\nconst a = 1;', errors: 1 },
    { code: '// ---- helpers ----\nconst a = 1;', errors: 1 },
    { code: '// TODO: later\nconst a = 1;', errors: 1 }
  ]
});
