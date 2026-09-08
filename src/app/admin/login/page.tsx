import LoginForm from "./login-form";

function BrandMark({ className = "" }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <span className="w-8 h-8 rounded-[12px] bg-white/15 flex items-center justify-center backdrop-blur-sm">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12.5 9.5 18 20 6.5"></path>
        </svg>
      </span>
      <span className="text-lg font-semibold tracking-tight text-white">Suara</span>
    </span>
  );
}

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
          <BrandMark className="mb-4" />
          <h1 className="text-5xl font-extrabold tracking-tight leading-[1.05] text-white">
            Hey, Hello!
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
          <div className="lg:hidden mb-8 flex justify-center">
            <span className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-[10px] bg-brand flex items-center justify-center">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 12.5 9.5 18 20 6.5"></path>
                </svg>
              </span>
              <span className="text-sm font-semibold text-ink tracking-tight">Suara</span>
              <span className="text-xs text-faint">Admin</span>
            </span>
          </div>
          <h2 className="text-2xl font-semibold text-ink mb-1.5 tracking-tight text-center lg:text-left">
            Welcome Back
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
