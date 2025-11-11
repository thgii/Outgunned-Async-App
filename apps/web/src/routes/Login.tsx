import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/store";
import { api } from "../lib/api";

export default function Login() {
  const [name, setName] = useState("Player One");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const setAuth = useAuth((s) => s.setAuth);
  const nav = useNavigate();
  const loc = useLocation() as any;
  const from = loc.state?.from?.pathname || "/";

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { token, user } = await api("/login-dev", {
        json: { name, email: email || undefined },
        method: "POST",
      });
      setAuth(token, user);
      nav(from, { replace: true });
    } catch (err: any) {
      alert(err?.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-md mx-auto py-10 px-4">
      <h1 className="text-2xl font-semibold mb-4">Sign in</h1>
      <form className="space-y-4" onSubmit={onLogin}>
        <div>
          <label className="block text-sm mb-1">Display name</label>
          <input
            className="w-full rounded border px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        {/*
        <div>
          <label className="block text-sm mb-1">Email (optional)</label>
          <input
            className="w-full rounded border px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        */}
        <button
          className="rounded bg-black text-white px-4 py-2 disabled:opacity-50"
          disabled={busy}
          type="submit"
        >
          {busy ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
