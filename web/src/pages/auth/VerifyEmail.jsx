import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { verifyEmail, resendVerification } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import { Icons } from "../../components/icons";

export default function VerifyEmail() {
  const navigate = useNavigate();
  const { refreshUser, login, user } = useAuth();
  const [otp,       setOtp]       = useState("");
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [focused, setFocused] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [sending, setSending] = useState(true);

  useEffect(() => {
    async function autoSend() {
      try {
        await resendVerification();
        setCodeSent(true);
      } catch (err) {
        if (err.response?.status === 429) {
          setCodeSent(true); // already sent recently, treat as sent
        } else {
          setError("Could not send code. Use 'Resend code' below.");
        }
      } finally {
        setSending(false);
      }
    }
    autoSend();
  }, []);

  async function onVerify(e) {
    e.preventDefault(); setError(""); setSuccess("");
    if (otp.length !== 6) { setError("Enter the 6-digit code."); return; }
    setVerifying(true);
    try {
      await verifyEmail(otp.trim());
      await refreshUser?.();
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Invalid or expired code.");
    } finally { setVerifying(false); }
  }

  async function onResend(e) {
    e.preventDefault(); setError(""); setSuccess(""); setResending(true);
    try {
      await resendVerification();
      setSuccess("Code resent — check your inbox.");
    } catch (err) {
      setError(err.response?.status === 429
        ? "Too many attempts. Please wait a few minutes."
        : "Could not resend. Please try again.");
    } finally { setResending(false); }
  }

  async function onSkip() {
    // Stay logged in, go to dashboard — banner will show
    navigate("/dashboard", { replace: true });
  }

  return (
    <div className="auth-wrap">
      <div style={{ width: "100%", maxWidth: 380 }} className="fade-up">

        {/* Logo header */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <img src="/logo.svg" alt="SplitEase"
            style={{ width: 56, height: 56, margin: "0 auto 10px", display: "block" }} />
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "-0.025em" }}>
            Split<span style={{ color: "#2563eb" }}>Ease</span>
          </div>
        </div>

        <div className="auth-card">
          {/* Mail icon with animation */}
          <style>{`
            @keyframes ve-drop { 
              0%   { opacity: 0; transform: translateY(-10px) scale(0.9); }
              60%  { transform: translateY(2px) scale(1.02); }
              100% { opacity: 1; transform: translateY(0) scale(1); }
            }
            @keyframes ve-pulse {
              0%, 100% { box-shadow: 0 0 0 0 rgba(37,99,235,0); }
              50%       { box-shadow: 0 0 0 6px rgba(37,99,235,0.08); }
            }
            @keyframes ve-flap {
              0%,100% { d: path("M22,6 12,13 2,6"); }
              50%     { d: path("M22,4 12,11 2,4"); }
            }
          `}</style>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              display: "flex", alignItems: "center", justifyContent: "center",
              animation: "ve-drop 0.45s cubic-bezier(0.34,1.56,0.64,1) both, ve-pulse 2.4s ease-in-out 0.6s infinite",
            }}>
              <Icons.mail size={22} color="var(--text2)" strokeWidth={1.8} />
            </div>
          </div>

          <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 6, textAlign: "center" }}>
            Check your inbox
          </div>
          <p style={{ fontSize: 13, color: "var(--text2)", marginBottom: 20, lineHeight: 1.6, textAlign: "center", minHeight: 40 }}>
            {sending ? (
              <span style={{ color: "var(--text3)" }}>Sending code…</span>
            ) : codeSent ? (
              <>
                Code sent to{" "}
                <span style={{ color: "var(--text)", fontWeight: 600 }}>{user?.email}</span>
              </>
            ) : (
              <span style={{ color: "var(--text3)" }}>Enter code from your email below.</span>
            )}
          </p>

          {error && (
            <div style={{
              fontSize: 13, color: "var(--danger)", marginBottom: 16,
              padding: "9px 12px", borderRadius: 8,
              background: "rgba(239,68,68,0.07)", border: "1px solid rgba(239,68,68,0.18)",
              display: "flex", alignItems: "center", gap: 7,
            }}>
              <Icons.alertTriangle size={14} />
              {error}
            </div>
          )}

          <form onSubmit={onVerify}>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text3)", marginBottom: 10 }}>
                Verification code
              </div>
              {/* OTP boxes — clicking anywhere on the row focuses the input */}
              <div style={{ position: "relative" }}
                onClick={() => document.getElementById("otp-input").focus()}>
                <div style={{ display: "flex", gap: 8, justifyContent: "center", cursor: "text" }}>
                  {Array.from({ length: 6 }, (_, i) => {
                    const isActive = focused && otp.length === i;
                    const isFilled = !!otp[i];
                    return (
                      <div key={i} style={{
                        width: 44, height: 52,
                        border: `1.5px solid ${isActive ? "var(--primary)" : isFilled ? "var(--border2)" : "var(--border)"}`,
                        borderRadius: 8,
                        background: isActive ? "rgba(37,99,235,0.04)" : "var(--surface2)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 22, fontWeight: 700, color: "var(--text)",
                        transition: "border-color 0.12s, background 0.12s",
                        userSelect: "none",
                      }}>
                        {otp[i] || ""}
                      </div>
                    );
                  })}
                </div>
                {/* Hidden input — NOT position:absolute with inset:0 to avoid blocking buttons */}
                <input
                  id="otp-input"
                  autoFocus
                  maxLength="6"
                  value={otp}
                  onChange={e => { setOtp(e.target.value.replace(/\D/g, "")); setError(""); setSuccess(""); }}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  style={{
                    position: "absolute", bottom: 0, left: "50%",
                    width: 1, height: 1, opacity: 0,
                    border: "none", outline: "none", padding: 0,
                    pointerEvents: "none",
                  }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              style={{ width: "100%" }}
              disabled={verifying}
            >
              {verifying ? "Verifying…" : "Verify Email →"}
            </button>
          </form>

          <div style={{ margin: "20px 0", height: 1, background: "var(--border)" }} />

          <div style={{ textAlign: "center", fontSize: 13, color: "var(--text3)" }}>
            Didn't receive it?{" "}
            <button
              type="button"
              onClick={onResend}
              disabled={resending}
              style={{ background: "none", border: "none", color: "var(--primary-h)",
                       fontWeight: 600, cursor: "pointer", fontSize: 13, padding: 0 }}>
              {resending ? "Sending…" : "Resend code"}
            </button>
          </div>

          <div style={{ textAlign: "center", marginTop: 10 }}>
            <button
              type="button"
              onClick={onSkip}
              style={{ background: "none", border: "none", color: "var(--text3)",
                       fontSize: 12, cursor: "pointer", padding: 0 }}>
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}