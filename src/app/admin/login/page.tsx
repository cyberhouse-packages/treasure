"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) throw new Error("Ungültiger Token.");
      router.replace("/admin");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler");
      setLoading(false);
    }
  }

  return (
    <main className="page">
      <div className="card">
        <div className="brand">immada · Admin</div>
        <h1>Anmelden</h1>
        <p className="lead">Bitte den Admin-Token eingeben.</p>
        <form onSubmit={submit}>
          <input
            className="input"
            type="password"
            placeholder="Admin-Token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            autoFocus
          />
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? "…" : "Anmelden"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
      </div>
    </main>
  );
}
