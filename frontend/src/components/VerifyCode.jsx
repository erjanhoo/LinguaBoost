import { useState } from "react";

export default function VerifyCode({ email, onVerify, onResend, error, type = "registration" }) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (code.length !== 6) return;
    setLoading(true);
    await onVerify(code);
    setLoading(false);
  };

  const handleResend = async () => {
    setLoading(true);
    await onResend();
    setLoading(false);
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <h1 className="auth-title">Verify Your Email</h1>
          <p className="auth-subtitle">
            We sent a 6-digit code to <strong>{email}</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="code" className="form-label">
              Verification Code
            </label>
            <input
              id="code"
              type="text"
              className="form-input verification-code-input"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              required
              maxLength={6}
              autoComplete="off"
              style={{ textAlign: "center", fontSize: "24px", letterSpacing: "8px" }}
            />
          </div>

          {error && <div className="auth-error">{error}</div>}

          <button type="submit" className="auth-button" disabled={loading || code.length !== 6}>
            {loading ? "Verifying..." : "Verify Code"}
          </button>

          <div style={{ textAlign: "center", marginTop: "16px" }}>
            <button
              type="button"
              onClick={handleResend}
              className="auth-link"
              disabled={loading}
              style={{ fontSize: "14px" }}
            >
              Didn't receive the code? Resend
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
