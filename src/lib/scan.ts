/**
 * Read more rows than one PostgREST response will hand over.
 *
 * A single request is capped server-side — 1000 rows by default — and
 * asking for more with .limit() does not fail, it just returns the cap.
 * That is the dangerous part: code that compares the result against its
 * own constant ("did I get my 3000 rows? no? then I saw everything")
 * concludes the opposite of the truth, and a screen built on it shows a
 * slice of a period while claiming to show the period.
 *
 * So page explicitly. The caller's `max` then means what it says, and
 * `truncated` is true only when the data really did run past it.
 */

const PAGE = 1000;

export async function scanRows<T>(
  runPage: (
    from: number,
    to: number
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
  max: number
): Promise<{ rows: T[]; truncated: boolean; error?: string }> {
  const rows: T[] = [];

  while (rows.length < max) {
    const from = rows.length;
    const to = Math.min(from + PAGE, max) - 1;
    const { data, error } = await runPage(from, to);

    if (error) return { rows, truncated: false, error: error.message };

    const batch = data ?? [];
    rows.push(...batch);

    // A short page means the table ran out before `max` did.
    if (batch.length < to - from + 1) return { rows, truncated: false };
  }

  return { rows, truncated: true };
}
