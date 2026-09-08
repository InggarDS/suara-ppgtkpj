import { PageLoading } from "@/components/ui/page-loading";

export default function Loading() {
  return (
    <div className="max-w-[1080px] mx-auto px-6 py-10">
      <PageLoading label="Memuat daftar acara…" />
    </div>
  );
}
