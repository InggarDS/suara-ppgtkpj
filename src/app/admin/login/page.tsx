import { PpgtLogo } from "@/components/ui/ppgt-logo";
import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="flex-1 flex bg-app-bg">
      {/* Left brand panel */}
      <div
        className="hidden lg:flex flex-col justify-center gap-5 w-1/2 px-16 xl:px-24 relative overflow-hidden"
        style={{ backgroundImage: "var(--gradient-brand)" }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(600px 400px at 12% 18%, rgba(255,255,255,0.18), transparent 60%), radial-gradient(700px 500px at 88% 92%, rgba(0,0,0,0.22), transparent 60%)",
          }}
        />
        <div className="relative flex flex-col gap-5">
          <span className="mb-4 flex items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-white flex items-center justify-center shadow-sm">
              <PpgtLogo size={36} priority />
            </span>
            <span className="text-lg font-semibold tracking-tight text-white">Suara PPGT KPJ</span>
          </span>
          <h1 className="text-5xl font-extrabold tracking-tight leading-[1.05] text-white">
            Kader Siap Utus, Teguh dalam Kristus !
          </h1>
          <p className="text-base font-medium text-white/85 max-w-sm">
            Suara Kita Untuk Pelayanan
          </p>
          <p className="text-sm text-white/60 max-w-sm leading-relaxed">
            Kelola pemilihan dan pemungutan suara untuk pelayanan organisasi Anda
            dalam satu tempat.
          </p>
        </div>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 flex flex-col items-center gap-2.5">
            <PpgtLogo size={56} priority />
            <span className="text-sm font-semibold text-ink tracking-tight">Suara</span>
          </div>
          <h2 className="text-2xl font-semibold text-ink mb-1.5 tracking-tight text-center lg:text-left">
            Selamat Datang
          </h2>
          <p className="text-sm text-body mb-7 text-center lg:text-left">
            Masuk untuk mengelola voting event Anda.
          </p>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
