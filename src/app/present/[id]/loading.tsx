import { PageLoading } from "@/components/ui/page-loading";

export default function Loading() {
  return (
    <div className="min-h-screen w-full bg-stage-dark text-white flex items-center justify-center">
      <PageLoading label="Menyiapkan layar…" />
    </div>
  );
}
