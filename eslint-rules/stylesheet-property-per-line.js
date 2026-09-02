/**
 * One property per line inside `StyleSheet.create`.
 *
 * Prettier cannot do this: it keeps whatever the author put on the first line,
 * so a style object stays collapsed forever once one person types it that way.
 * The scope is deliberately narrow -- a style object is read down its left
 * edge, while an ordinary call-site object like `useWatch({ control, name })`
 * reads better on one line.
 */
const isStyleSheetCreate = (node) =>
  node.type === 'CallExpression' &&
  node.callee.type === 'MemberExpression' &&
  node.callee.object.type === 'Identifier' &&
  node.callee.object.name === 'StyleSheet' &&
  node.callee.property.type === 'Identifier' &&
  node.callee.property.name === 'create';

module.exports = {
  meta: {
    type: 'layout',
    docs: { description: 'Put every property of a StyleSheet rule on its own line.' },
    fixable: 'whitespace',
    schema: []
  },
  create(context) {
    const source = context.sourceCode ?? context.getSourceCode();

    const checkObject = (node) => {
      if (node.properties.length === 0) return;

      const open = source.getFirstToken(node);
      const close = source.getLastToken(node);
      const first = node.properties[0];
      const last = node.properties[node.properties.length - 1];

      const breaks = [
        [open, first],
        ...node.properties.slice(1).map((property, index) => [node.properties[index], property]),
        [last, close]
      ];

      for (const [before, after] of breaks) {
        const start = before.loc.end.line;
        const end = after.loc.start.line;

        if (start !== end) continue;

        context.report({
          node: after,
          message: 'Every property of a style rule belongs on its own line.',
          // Insert only. Replacing the gap would swallow the comma that
          // separates two properties, and the file would stop parsing.
          fix: (fixer) => fixer.insertTextBefore(after, '\n')
        });
        return;
      }
    };

    const walk = (node) => {
      if (node.type !== 'ObjectExpression') return;

      checkObject(node);

      for (const property of node.properties) {
        if (property.type === 'Property') walk(property.value);
      }
    };

    return {
      CallExpression(node) {
        if (!isStyleSheetCreate(node)) return;

        const [argument] = node.arguments;

        if (argument && argument.type === 'ObjectExpression') {
          for (const property of argument.properties) {
            if (property.type === 'Property') walk(property.value);
          }
        }
      }
    };
  }
};
