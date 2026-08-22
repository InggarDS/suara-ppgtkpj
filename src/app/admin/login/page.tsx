import LoginForm from "./login-form";

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-app-bg px-6">
      <div className="w-full max-w-sm bg-card border border-border-1 rounded-2xl p-7 shadow-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-7 h-7 rounded-[7px] bg-brand flex items-center justify-center">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 12.5 9.5 18 20 6.5"></path>
            </svg>
          </div>
          <span className="text-sm font-semibold text-ink tracking-tight">Suara</span>
          <span className="text-xs text-faint">Admin</span>
        </div>
        <h1 className="text-xl font-semibold text-ink mb-1 tracking-tight">Sign in</h1>
        <p className="text-sm text-body mb-6">Manage voting events for your organization.</p>
        <LoginForm />
      </div>
    </div>
  );
}
