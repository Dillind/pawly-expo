const nullable = (member: string) => {
  const trimmed = member.trim().replace(/;$/, '');
  return trimmed.endsWith('| null') ? trimmed : `${trimmed} | null`;
};

const patchInline = (line: string) =>
  line.replace(/Args: \{ ([^{}]+?) \}/g, (_match, members: string) => {
    const patched = members
      .split(';')
      .filter((member) => member.trim())
      .map(nullable);
    return `Args: { ${patched.join('; ')} }`;
  });

// `supabase gen types` cannot express a nullable function argument, and every one here is.
export function makeRpcArgsNullable(generated: string): string {
  let inArgs = false;

  return generated
    .split('\n')
    .map((line) => {
      if (/^\s+Args: \{$/.test(line)) {
        inArgs = true;
        return line;
      }
      if (inArgs && /^\s+\};?$/.test(line)) {
        inArgs = false;
        return line;
      }
      if (inArgs) return line.replace(/^(\s+\w+\??: )([^;]+?)(?: \| null)?;?$/, '$1$2 | null');
      return patchInline(line);
    })
    .join('\n');
}
