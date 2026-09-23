// The comment rules in AGENTS.md > Comments, enforced: a block runs three lines at most, and a
// JSDoc block, a banner, or a TODO with no ticket is never allowed.
const MAX_LINES = 3;

const isDirective = (text) => /^\s*(eslint|@ts-|prettier-ignore|cspell)/.test(text);

module.exports = {
  meta: {
    type: 'suggestion',
    docs: { description: 'Keep comments short, and ban JSDoc, banners and unticketed TODOs.' },
    schema: []
  },
  create(context) {
    const source = context.sourceCode ?? context.getSourceCode();

    return {
      Program() {
        const comments = source.getAllComments().filter((comment) => !isDirective(comment.value));
        let run = [];

        const reportLength = (start, end) => {
          const lines = end.line - start.line + 1;
          if (lines <= MAX_LINES) return;
          context.report({
            loc: { start, end },
            message: `A comment block is ${lines} lines. Keep it to ${MAX_LINES}; a longer reason belongs in DECISIONS.md, KNOWLEDGE.md or an ADR.`
          });
        };

        const flush = () => {
          if (run.length > 0) reportLength(run[0].loc.start, run[run.length - 1].loc.end);
          run = [];
        };

        for (const comment of comments) {
          const text = comment.value;

          if (comment.type === 'Block' && text.startsWith('*')) {
            context.report({
              node: comment,
              message:
                'No JSDoc blocks. The signature is the documentation; a reason is one // line.'
            });
          }
          if (/^\s*(-{3,}|={3,}|MARK:)/.test(text)) {
            context.report({ node: comment, message: 'No banner or section-divider comments.' });
          }
          if (/\bTODO\b(?!\(CRU-\d{3}\))/.test(text)) {
            context.report({ node: comment, message: 'A TODO names its ticket: TODO(CRU-123).' });
          }

          if (comment.type === 'Block') {
            flush();
            reportLength(comment.loc.start, comment.loc.end);
            continue;
          }

          const previous = run[run.length - 1];
          const isSameBlock =
            previous &&
            comment.loc.start.line === previous.loc.end.line + 1 &&
            source.text.slice(previous.range[1], comment.range[0]).trim() === '';
          if (previous && !isSameBlock) flush();
          run.push(comment);
        }
        flush();
      }
    };
  }
};
