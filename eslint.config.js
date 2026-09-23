// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const commentDiscipline = require('./eslint-rules/comment-discipline');
const stylesheetPropertyPerLine = require('./eslint-rules/stylesheet-property-per-line');

// Each is a pattern that passes typecheck and costs a refactor later. See /crumpet-code-conventions.
const QUERY_KEY = {
  selector:
    "Property[key.name='queryKey'] > ArrayExpression, VariableDeclarator[id.name=/[kK]ey$/] > ArrayExpression",
  message: 'Build the key with queryKeys from @/lib/query-keys, so invalidation cannot drift.'
};
const FORM_TEXT_INPUT = {
  selector:
    "JSXElement[openingElement.name.name='Controller'] JSXOpeningElement[name.name='TextInputValidated']",
  message: 'Use FormTextInput. It binds the field with useController, so no Controller or useWatch.'
};
const FORWARD_REF = {
  selector:
    "CallExpression[callee.property.name='forwardRef'], CallExpression[callee.name='forwardRef']",
  message: 'React 19 passes ref as a prop. Declare `ref?: Ref<T>` in the props instead.'
};
const STORE_SELECTOR = {
  selector: 'CallExpression[callee.name=/^use\\w+Store$/] > ArrowFunctionExpression',
  message: 'Destructure the store: const { value } = useThingStore(). See AGENTS.md > State.'
};
const TEXT_SIZE = {
  selector:
    "JSXOpeningElement[name.name='AppText'] > JSXAttribute[name.name='size'] > JSXExpressionContainer > Literal[raw=/^(11|12|13|14|15|16|17|18|22|28|34)$/]",
  message: 'That size is a TypeScale step. Pass its name: size="footnote".'
};
const RADIUS = {
  selector: "Property[key.name='borderRadius'] > Literal[raw=/^(8|10|12|14|18|24|28|100|999)$/]",
  message: 'That radius is a Radius token in @/constants/theme. Use it.'
};
const RAW_COLOUR = {
  selector: 'Literal[value=/^(#[0-9a-fA-F]{3,8}|rgba?\\(.*\\))$/]',
  message: 'Colours come from the theme: colors.x, or OverlayColors on a photo or a fill.'
};
const FEED_LOG_INSERT = {
  selector:
    "CallExpression[callee.property.name='insert'] > MemberExpression > CallExpression[arguments.0.value='feed_logs']",
  message:
    'A feed log is created only through the log_feed RPC. The Double Feed guard and the alert hang off it.'
};
const WATCH = {
  selector: "CallExpression[callee.name='watch']",
  message: 'Use useWatch({ control, name }). React Compiler cannot memoise watch().'
};
const THROW_ERROR = {
  selector:
    "VariableDeclaration:not(:has(Property[key.name='count'])) + IfStatement[test.name='error'] > ThrowStatement[argument.name='error']",
  message: 'Use unwrap() from @/lib/supabase/unwrap.'
};

const APP_SYNTAX = [
  QUERY_KEY,
  FORM_TEXT_INPUT,
  FORWARD_REF,
  STORE_SELECTOR,
  TEXT_SIZE,
  RADIUS,
  FEED_LOG_INSERT,
  WATCH
];

const RESTRICTED_IMPORTS = {
  paths: [
    {
      name: 'react-native',
      importNames: ['FlatList', 'SectionList', 'VirtualizedList'],
      message: 'Lists render through MainLegendList.'
    },
    { name: '@shopify/flash-list', message: 'Lists render through MainLegendList.' },
    {
      name: '@legendapp/list',
      message: 'Lists render through MainLegendList; only type imports are allowed here.',
      allowTypeImports: true
    },
    {
      name: '@legendapp/list/react-native',
      message: 'Lists render through MainLegendList; only type imports are allowed here.',
      allowTypeImports: true
    },
    { name: 'sonner-native', message: 'Toasts go through @/lib/toast.' },
    {
      name: '@lodev09/react-native-true-sheet',
      importNames: ['TrueSheet'],
      message: 'Build on BaseSheet. Import TrueSheet as a type for the ref.',
      allowTypeImports: true
    },
    { name: 'lucide-react-native', message: 'Use <Icon name="..." />. See ADR 0008.' },
    { name: 'expo-haptics', message: 'Use the helpers in @/lib/haptics.' },
    {
      name: '@/lib/supabase/client',
      message: 'A remote call belongs in src/services, and a query hook wraps it.'
    }
  ]
};

module.exports = defineConfig([
  expoConfig,
  {
    plugins: {
      crumpet: {
        rules: {
          'comment-discipline': commentDiscipline,
          'stylesheet-property-per-line': stylesheetPropertyPerLine
        }
      }
    },
    rules: {
      'crumpet/stylesheet-property-per-line': 'error'
    }
  },
  {
    files: ['src/**/*.{ts,tsx}', 'supabase/functions/**/*.ts', 'eslint-rules/**/*.js'],
    rules: {
      'crumpet/comment-discipline': 'error'
    }
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-console': 'error',
      'no-restricted-syntax': ['error', ...APP_SYNTAX, RAW_COLOUR],
      '@typescript-eslint/no-restricted-imports': ['error', RESTRICTED_IMPORTS]
    }
  },
  {
    files: ['src/services/**/*.ts'],
    rules: {
      'no-restricted-syntax': ['error', ...APP_SYNTAX, RAW_COLOUR, THROW_ERROR],
      '@typescript-eslint/no-restricted-imports': [
        'error',
        { paths: RESTRICTED_IMPORTS.paths.filter((path) => path.name !== '@/lib/supabase/client') }
      ]
    }
  },
  {
    // The token files themselves, and art whose colours are fixed by a brand or a drawing.
    files: [
      'src/constants/**',
      'src/components/screens/home/banner-sun.tsx',
      'src/components/screens/auth/social-auth-buttons.tsx',
      'src/components/screens/auth/google-mark.tsx',
      'src/components/screens/household/follow-link.tsx',
      'src/components/screens/household/invite-code-card.tsx',
      'src/components/core/segmented-control.tsx'
    ],
    rules: {
      'no-restricted-syntax': ['error', ...APP_SYNTAX]
    }
  },
  {
    files: [
      'src/lib/errors.ts',
      'src/components/bottom-sheets/base-sheet.tsx',
      'src/lib/toast.ts',
      'src/lib/haptics.ts',
      'src/lib/supabase/**',
      'src/constants/icon-map.ts',
      'src/components/core/main-legend-list.tsx',
      'src/lib/query-keys.ts',
      'src/types/database.ts'
    ],
    rules: {
      'no-console': 'off',
      '@typescript-eslint/no-restricted-imports': 'off'
    }
  },
  {
    ignores: ['dist/*', '.design/**', 'src/types/database.ts']
  }
]);
