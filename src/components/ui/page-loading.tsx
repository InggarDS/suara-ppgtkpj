import { Spinner } from "./spinner";

export function PageLoading({ label = "Memuat…" }: { label?: string }) {
  return (
    <div className="flex-1 min-h-[320px] w-full flex flex-col items-center justify-center gap-3 py-16 text-faint">
      <Spinner className="w-6 h-6 text-brand" />
      <span className="text-[13px]">{label}</span>
    </div>
  );
}
