"use client";

import { useActionState } from "react";
import { loginAction, LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginForm() {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <label className="block text-xs font-medium text-body mb-1.5">Email</label>
        <input
          name="email"
          type="email"
          required
          placeholder="admin@ppgtkpj.org"
          className="w-full border border-border-1 rounded-lg px-3.5 py-2.5 text-sm text-ink bg-paper outline-none focus:border-brand"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-body mb-1.5">Password</label>
        <input
          name="password"
          type="password"
          required
          className="w-full border border-border-1 rounded-lg px-3.5 py-2.5 text-sm text-ink bg-paper outline-none focus:border-brand"
        />
      </div>
      {state.error && <p className="text-xs text-danger">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="glow-ring w-full bg-brand text-white rounded-full py-2.5 text-sm font-semibold cursor-pointer hover:bg-brand-hover disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
