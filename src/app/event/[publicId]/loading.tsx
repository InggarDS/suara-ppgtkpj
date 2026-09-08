import { PageLoading } from "@/components/ui/page-loading";

export default function Loading() {
  return (
    <div className="min-h-screen bg-app-bg flex items-center justify-center px-4">
      <div className="elevated w-full max-w-[420px] bg-paper rounded-[34px] border border-border-1 min-h-[600px] flex items-center justify-center">
        <PageLoading />
      </div>
    </div>
  );
}
