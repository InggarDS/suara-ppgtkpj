import { PageLoading } from "@/components/ui/page-loading";

/**
 * Mirrors a real event tab exactly — EventHeader-height bar + a bg-paper
 * content area that fills the rest — so the fixed workspace card never
 * changes size between the skeleton and the loaded page.
 */
export default function Loading() {
  return (
    <>
      <div className="px-8 pt-6.5 pb-4.5 border-b border-border-4 flex items-start gap-5">
        <div className="flex-1 min-w-0">
          <div className="h-6 w-44 rounded-md bg-border-4 animate-pulse" />
          <div className="mt-2.5 h-3.5 w-80 max-w-full rounded bg-border-5 animate-pulse" />
        </div>
        <div className="h-9 w-[168px] rounded-[16px] bg-border-4 animate-pulse flex-none" />
      </div>
      <div className="flex-1 min-h-0 px-8 pt-6.5 pb-10 bg-paper flex items-center justify-center">
        <PageLoading />
      </div>
    </>
  );
}
