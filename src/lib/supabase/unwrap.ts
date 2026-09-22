type Result = { data: unknown; error: null } | { data: null; error: Error };

type Success<R> = R extends { data: infer T; error: null } ? T : never;

export async function unwrap<R extends Result>(query: PromiseLike<R>): Promise<Success<R>> {
  const { data, error } = await query;
  if (error) throw error;
  return data as Success<R>;
}
