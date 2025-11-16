import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/store";
import { api } from "../lib/api";

export default function Login() {
  const [name, setName] = useState("Player One");
  const [email, setEmail] = useState("");
  const [passcode, setPasscode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAuth = useAuth((s) => s.setAuth);
  const nav = useNavigate();
  const loc = useLocation() as any;
  const from = loc.state?.from?.pathname || "/";

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!/^[0-9]{6}$/.test(passcode.trim())) {
      setError("Passcode must be a 6-digit code.");
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const body: any = {
        name: name.trim(),
        passcode: passcode.trim(),
      };
      if (email.trim()) body.email = email.trim();

      const res = await api.post("/login", body); // expects { token, user }
      setAuth(res.token, res.user);
      nav(from, { replace: true });
    } catch (err: any) {
      console.error("Login failed", err);
      const msg =
        err?.message ||
        err?.error ||
        (typeof err === "string" ? err : "Login failed. Check your name and passcode.");
      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <form
        onSubmit={onLogin}
        className="w-full max-w-md bg-slate-800/90 border border-slate-700 rounded-xl p-6 shadow-xl space-y-4"
      >
        <h1 className="text-xl font-semibold text-white text-center mb-2">
          Sign in to Outgunned Async
        </h1>
        <p className="text-xs text-slate-300 text-center mb-2">
          Enter your name and 6-digit passcode to join your campaigns.
        </p>

        {error && (
          <div className="text-sm text-red-300 bg-red-900/40 border border-red-700 rounded px-3 py-2">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-200">
            Name
          </label>
          <input
            type="text"
            className="w-full rounded-md border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Player name"
            disabled={busy}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-200">
            6-digit Passcode
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            pattern="[0-9]{6}"
            className="w-full rounded-md border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-white tracking-[0.3em] text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={passcode}
            onChange={(e) =>
              setPasscode(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))
            }
            placeholder="••••••"
            disabled={busy}
          />
          <p className="text-[11px] text-slate-400 mt-1">
            Your director should give you this code.
          </p>
        </div>

        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-200">
            Email (optional)
          </label>
          <input
            type="email"
            className="w-full rounded-md border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={busy}
          />
        </div>

        <button
          className="w-full rounded-md bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          disabled={busy}
          type="submit"
        >
          {busy ? "Signing in…" : "Sign In"}
        </button>
      </form>
    </div>
  );
}
