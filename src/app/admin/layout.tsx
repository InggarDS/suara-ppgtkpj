import { getAdminSession } from "@/lib/auth";
import { logoutAction } from "./actions";
import Link from "next/link";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession();

  return (
    <div className="min-h-screen bg-app-bg flex flex-col">
      <div className="flex items-center gap-4 flex-wrap px-6.5 py-4 border-b border-border-1">
        <Link href="/admin/events" className="flex items-center gap-2.5">
          <div className="w-[26px] h-[26px] rounded-[10px] bg-brand flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5 9.5 18 20 6.5"></path>
            </svg>
          </div>
          <span className="text-sm font-semibold text-ink tracking-tight">Suara</span>
          <span className="text-xs text-faint hidden sm:inline">Suara Kita Untuk Pelayanan</span>
        </Link>
        <div className="flex-1" />
        <div className="flex items-center gap-3">
          <ThemeToggle />
          {session && (
            <>
              <span className="text-xs text-body">{session.name}</span>
              <form action={logoutAction}>
                <button className="text-xs font-medium text-body border border-border-1 rounded-md px-2.5 py-1.5 cursor-pointer hover:border-hairline">
                  Sign out
                </button>
              </form>
            </>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
      <div className="text-center text-[11px] text-faint py-4 border-t border-border-1">
        © PPGT Klasis Pulau Jawa 2026
      </div>
    </div>
  );
}
