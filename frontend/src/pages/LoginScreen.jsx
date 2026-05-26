import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { BrainCircuit } from "../lib/icons";

export default function LoginScreen({ onLoginSuccess }) {
  const [email, setEmail] = useState("admin@nexora.ai");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (loginError) throw loginError;

      onLoginSuccess?.(data.session);
    } catch (err) {
      console.error(err);
      setError(err.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#F6F8FC] grid lg:grid-cols-[1.1fr_.9fr]">
      <section className="relative hidden lg:flex items-center justify-center overflow-hidden bg-slate-950 p-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,.45),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,.35),transparent_32%)]" />

        <div className="relative max-w-xl text-white">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-blue-50">
            <BrainCircuit size={16} />
            Nexora AI Studio
          </div>

          <h1 className="mt-7 text-5xl font-black tracking-tight leading-tight">
            Build intelligent chatbot operations from one workspace.
          </h1>

          <p className="mt-5 text-blue-100 leading-8">
            Manage bot flows, inbox handoff, AI knowledge, widget installation,
            and workspace operations in one SaaS dashboard.
          </p>

          <div className="mt-8 grid grid-cols-3 gap-3">
            {["Bot Builder", "Inbox", "AI Knowledge"].map((item) => (
              <div
                key={item}
                className="rounded-2xl border border-white/15 bg-white/10 p-4 text-sm font-bold text-blue-50"
              >
                {item}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="flex items-center justify-center p-6">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm"
        >
          <div className="h-12 w-12 rounded-2xl bg-slate-950 text-white grid place-items-center font-black">
            N
          </div>

          <h2 className="mt-6 text-3xl font-black text-slate-950">
            Sign in to Nexora
          </h2>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Login using your Supabase Auth account to access your workspace.
          </p>

          {error && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div>
              <label className="text-xs font-black uppercase tracking-wide text-slate-400">
                Email
              </label>
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:ring-4 focus:ring-blue-100"
                placeholder="admin@nexora.ai"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-black uppercase tracking-wide text-slate-400">
                Password
              </label>
              <input
                className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:ring-4 focus:ring-blue-100"
                placeholder="Enter password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="mt-6 h-12 w-full rounded-2xl bg-blue-600 text-white text-sm font-black shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>

          <p className="mt-5 text-center text-xs text-slate-400">
            For MVP testing, use the user you created in Supabase Auth.
          </p>
        </form>
      </section>
    </main>
  );
}