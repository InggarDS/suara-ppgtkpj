/**
 * Thin indeterminate progress bar pinned to the top of its positioned parent.
 * Shown while a participant action (register, check-in, vote, photo compress) is
 * being processed. The parent must be `position: relative` and clip overflow.
 */
export function TopProgress({ active }: { active: boolean }) {
  if (!active) return null;
  return <div className="progress-indeterminate" aria-label="Memproses" role="progressbar" />;
}
