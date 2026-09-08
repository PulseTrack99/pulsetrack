/**
 * "The migration has not run yet" told apart from "something broke".
 *
 * Several screens ship ahead of the SQL they need, because this
 * deployment applies migrations by hand. A feature that half-exists in
 * the code and throws in the browser is worse than one that says which
 * file to run, so every route built on new SQL asks this first.
 */
export function isMissingSchema(
  err: { code?: string; message?: string } | null
): boolean {
  if (!err) return false;
  return (
    err.code === "42883" || // undefined_function
    err.code === "42P01" || // undefined_table
    err.code === "42703" || // undefined_column

    err.code === "PGRST202" || // PostgREST: no such RPC
    err.code === "PGRST205" || // PostgREST: no such table
    /does not exist|schema cache/i.test(err.message ?? "")
  );
}
