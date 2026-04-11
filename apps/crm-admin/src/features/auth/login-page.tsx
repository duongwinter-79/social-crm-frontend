import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@social-crm/api";
import "./login-page.css";

export function LoginPage() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await apiClient.login(username, password);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-shell">
        <section className="login-brand-panel">
          <div className="login-brand-top">
            <div className="login-brand-mark">SC</div>
            <div>
              <div className="login-brand-kicker">Social CRM</div>
              <div className="login-brand-title">Admin Console</div>
              <div className="login-brand-subtitle">Internal recruitment operations</div>
            </div>
          </div>

          <div className="login-hero">
            <h1>Lead operations, matching control, and recruiting decisions in one CRM workspace.</h1>
            <p>
              Use this admin console to process inbound candidates, review structured profile data, evaluate order fit, and monitor the backend integration layer without jumping across disconnected tools.
            </p>
          </div>

          <div className="login-feature-grid">
            <div className="login-feature-card sky">
              <h3>Lead triage queue</h3>
              <p>Search, filter, and move candidates through the backend state machine with clear next actions.</p>
            </div>
            <div className="login-feature-card white">
              <h3>Structured review</h3>
              <p>Validate AI extraction, update profile fields, and compare operator judgment with backend data.</p>
            </div>
            <div className="login-feature-card amber">
              <h3>Matching control</h3>
              <p>Evaluate order eligibility, surface reject reasons, and review approval-risk cases in one place.</p>
            </div>
          </div>

          <div className="login-meta-grid">
            <SystemPoint label="Auth model" value="JWT + refresh token" />
            <SystemPoint label="Operator surface" value="Admin-only CRM console" />
            <SystemPoint label="Backend dependency" value="Live API connection required" />
          </div>
        </section>

        <aside className="login-form-card">
          <div className="login-form-header">
            <h2>Sign in</h2>
            <p>Use your staff credentials to enter the CRM admin console.</p>
          </div>

          <div className="login-access-note">
            <strong>Access scope</strong>
            <span>This screen authenticates internal operators only. Candidate-facing flows stay on a separate app boundary.</span>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="login-form-group">
              <label className="login-form-label" htmlFor="username">Username</label>
              <input
                id="username"
                className="login-form-control"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your operator username"
                autoComplete="username"
              />
              <div className="login-inline-help">Use the account provided for your staff role.</div>
            </div>

            <div className="login-form-group">
              <label className="login-form-label" htmlFor="password">Password</label>
              <input
                id="password"
                className="login-form-control"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
              />
            </div>

            {error ? <div className="login-error">{error}</div> : null}

            <button className="login-submit" type="submit" disabled={loading}>
              {loading ? "Signing in..." : "Enter admin console"}
            </button>
          </form>

          <div className="login-footnote">
            <strong>Verification note</strong>
            <span>If authentication fails here, verify backend health and JWT configuration before reviewing protected routes.</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SystemPoint(props: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-[0.18em] text-slate-400">{props.label}</div>
      <div className="mt-2 text-sm font-medium text-slate-700">{props.value}</div>
    </div>
  );
}
