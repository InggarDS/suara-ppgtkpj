"use client";

import { useActionState, useState } from "react";
import { BusyLabel } from "@/components/ui/spinner";
import { loginAction, LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);
  const [showPassword, setShowPassword] = useState(false);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-medium text-body mb-1.5">Username</label>
        <input
          name="email"
          type="text"
          autoComplete="username"
          required
          placeholder="Username"
          className="w-full border border-border-1 rounded-lg px-3.5 py-2.5 text-sm text-ink bg-paper outline-none focus:border-brand"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-body mb-1.5">Password</label>
        <div className="relative">
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            placeholder="Password"
            className="w-full border border-border-1 rounded-lg pl-3.5 pr-11 py-2.5 text-sm text-ink bg-paper outline-none focus:border-brand"
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            aria-label={showPassword ? "Hide password" : "Show password"}
            aria-pressed={showPassword}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-faint hover:text-ink cursor-pointer"
          >
            {showPassword ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                <path d="M1 1l22 22" />
                <path d="M6.61 6.61A13.53 13.53 0 0 0 2 12s3 8 10 8a9.74 9.74 0 0 0 5.39-1.61" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="btn-gradient w-full rounded-full py-2.5 text-sm font-semibold cursor-pointer"
      >
        <BusyLabel busy={pending} busyText="Signing in…">Login</BusyLabel>
      </button>
    </form>
  );
}
