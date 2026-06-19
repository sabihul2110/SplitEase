// --- web/src/pages/auth/Signup.jsx ---


import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { resendVerification, signup, verifyEmail } from "../../api/auth";
import PasswordInput from "../../components/common/PasswordInput";
import { useAuth } from "../../context/AuthContext";
import { Icons } from "../../components/icons";

export default function Signup() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const [params]  = useSearchParams();
  const next      = params.get("next") || "/dashboard";

  const [form, setForm] = useState({ name: "", email: "", password: "", upi_id: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState("form");
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [pendingData, setPendingData] = useState(null);

  async function onSubmit(e) {
    e.preventDefault(); setError("");
    if (form.password.length < 8) { setError("Password must be at least 8 characters."); return; }
    setLoading(true);
    try {
      const { data } = await signup({ ...form, upi_id: form.upi_id.trim() || null });
      login(data);
      setPendingData(data);
      setStep("verify");
    } catch (err) {
      const status = err.response?.status;
      if (status === 207) {
        login(err.response.data);
        setError("Account created! Verification email could not be sent. Resend from your profile.");
        setTimeout(() => navigate(next, { replace: true }), 4000);
      } else if (status === 429) {
        setError("Too many signup attempts from this network. Please wait a few minutes.");
      } else if (status === 503) {
        setError("Our email service is temporarily unavailable. Please try again in a few minutes.");
      } else {
        setError(err.response?.data?.detail || "Signup failed.");
      }
    } finally { setLoading(false); }
  }

  async function onVerify(e) {
    e.preventDefault(); setError("");
    if (otp.length !== 6) { setError("Enter the 6-digit code from your email."); return; }
    setVerifying(true);
    try {
      await verifyEmail(otp.trim());
      navigate(next, { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired code.");
    } finally { setVerifying(false); }
  }

  async function onResend(e) {
    e.preventDefault(); setError(""); setResending(true);
    try {
      await resendVerification();
      setError("");
    } catch (err) {
      const status = err.response?.status;
      setError(status === 429
        ? "Too many attempts. Please wait a few minutes."
        : "Could not resend. Please try again shortly.");
    } finally { setResending(false); }
  }

  if (step === "verify") {
    return (
      <div className="auth-wrap">
        <div style={{ width: "100%", maxWidth: 380 }} className="fade-up">
          <div style={{ textAlign: "center", marginBottom: 28 }}>
            <img
              src="/logo.svg"
              alt="SplitEase Logo"
              style={{ width: 64, height: 64, margin: "0 auto 12px", display: "block" }}
            />
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em" }}>
              Split <span style={{ color: '#2563eb' }}>Ease</span>
            </div>
            <div style={{ fontSize: 14, color: "var(--text2)", marginTop: 4 }}>
              Split fair. Settle fast.
            </div>
          </div>
          <div className="auth-card">
            <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Verify your email</div>
            <p style={{ fontSize: 14, color: "var(--text2)", marginBottom: 20, lineHeight: 1.5 }}>
              We sent a 6-digit code to <strong style={{ color: "var(--text)" }}>{form.email}</strong>.
              Enter it below to activate your account.
            </p>
            {error && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                <Icons.alertTriangle size={15} />
                {error}
              </div>
            )}
            <form onSubmit={onVerify}>
              <div className="form-group" style={{ marginBottom: 20 }}>
                <label className="form-label">Verification code</label>
                <input
                  required autoFocus maxLength="6" placeholder="123456"
                  style={{ letterSpacing: "0.5em", fontSize: 20, fontWeight: 700, textAlign: "center" }}
                  value={otp} onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); }}
                />
              </div>
              <button className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={verifying}>
                {verifying ? "Verifying…" : "Verify Email →"}
              </button>
            </form>
            <div className="divider" style={{ margin: "20px 0" }} />
            <div style={{ textAlign: "center", fontSize: 14, color: "var(--text2)" }}>
              Didn't receive it?{" "}
              <button onClick={onResend} disabled={resending}
                style={{ background: "none", border: "none", color: "var(--primary-h)",
                         fontWeight: 600, cursor: "pointer", fontSize: 14, padding: 0 }}>
                {resending ? "Sending…" : "Resend code"}
              </button>
            </div>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <button onClick={() => { navigate(next, { replace: true }); }}
                style={{ background: "none", border: "none", color: "var(--text3)",
                         fontSize: 13, cursor: "pointer" }}>
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div style={{ width: "100%", maxWidth: 380 }} className="fade-up">
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img 
            src="/logo.svg" 
            alt="SplitEase Logo" 
            style={{ width: 64, height: 64, margin: "0 auto 12px", display: "block" }} 
          />
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: "-0.025em" }}>
            Split<span style={{ color: '#2563eb', marginLeft: 3 }}>Ease</span>
          </div>
          <div style={{ fontSize: 14, color: "var(--text2)", marginTop: 4 }}>
            Split fair. Settle fast.
          </div>
        </div>

        <div className="auth-card">
          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 20 }}>Create account</div>
          {next !== "/dashboard" && (
            <div className="alert alert-success" style={{ marginBottom: 16 }}>
              Create an account to join the group.
            </div>
          )}
          {error && (
            <div className="alert alert-error">
              <Icons.alertTriangle size={15} />
              {error}
            </div>
          )}

          <form onSubmit={onSubmit}>
            <div className="form-group">
              <label className="form-label">Full name</label>
              <input required autoFocus placeholder="Ayaan Khan"
                value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Email address</label>
              <input type="email" required placeholder="you@college.edu"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <PasswordInput
                required
                placeholder="Min. 8 characters"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
            </div>
            <div className="form-group" style={{ marginBottom: 20 }}>
              <label className="form-label">
                UPI ID{" "}
                <span style={{ textTransform: "none", fontWeight: 400, color: "var(--text3)" }}>
                  — optional
                </span>
              </label>
              <input placeholder="name@upi"
                value={form.upi_id} onChange={e => setForm(f => ({ ...f, upi_id: e.target.value }))} />
            </div>
            <button className="btn btn-primary btn-lg" style={{ width: "100%" }} disabled={loading}>
              {loading ? "Creating…" : "Create account →"}
            </button>
          </form>

          <div className="divider" style={{ margin: "20px 0" }} />
          <div style={{ textAlign: "center", fontSize: 14, color: "var(--text2)" }}>
            Have an account?{" "}
            <Link to={`/login?next=${next}`} style={{ color: "var(--primary-h)", fontWeight: 600 }}>
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}