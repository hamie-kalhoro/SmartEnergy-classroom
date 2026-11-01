import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import api from "../api";
import AuthLayout, { AuthField, AuthNotice, PasswordField } from "../components/AuthLayout";

const ARRIVAL_NOTICES = {
  activated: { tone: "success", text: "Your account is active. You can now sign in." },
  reset: { tone: "success", text: "Your password has been changed. Sign in with your new password." },
  expired: { tone: "info", text: "Your session has expired. Please sign in again." },
};

function Login({ onLogin }) {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [resendStatus, setResendStatus] = useState(null);
  const [resending, setResending] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const arrival = Object.keys(ARRIVAL_NOTICES).find((key) => params.get(key) === "true");
    if (arrival) {
      setNotice(ARRIVAL_NOTICES[arrival]);
      window.history.replaceState({}, document.title, "/login");
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setNotice(null);
    setResendStatus(null);
    try {
      const res = await api.post("/api/login", formData);
      if (res.data.success) {
        // Combine user info and token for storage
        onLogin({ ...res.data.user, token: res.data.token });
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Could not sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);
    setResendStatus(null);
    try {
      const res = await api.post("/api/resend-activation", { login: formData.username });
      setResendStatus({ ok: true, message: res.data.message });
    } catch (err) {
      setResendStatus({
        ok: false,
        message: err.response?.data?.message || "The email could not be sent.",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthLayout
      title="Sign in to SmartClass"
      subtitle="Use your email or username to continue."
      footer={
        <>
          Don't have an account? <Link to="/signup" className="auth-link">Create account</Link>
        </>
      }>
      {notice && <AuthNotice tone={notice.tone}>{notice.text}</AuthNotice>}

      {error && (
        <AuthNotice tone="error">
          {error}
          {error === "Account not activated" && (
            <div className="auth-notice-detail">
              <button type="button" className="auth-secondary" onClick={handleResend} disabled={resending}>
                {resending ? "Sending..." : "Resend activation email"}
              </button>
              {resendStatus && <div className="auth-notice-detail" role="status">{resendStatus.message}</div>}
            </div>
          )}
        </AuthNotice>
      )}

      <form onSubmit={handleSubmit}>
        <AuthField
          id="login-username"
          label="Email or username"
          name="username"
          type="text"
          autoComplete="username"
          required
          value={formData.username}
          onChange={(e) => setFormData({ ...formData, username: e.target.value })}
        />
        <PasswordField
          id="login-password"
          label="Password"
          name="password"
          autoComplete="current-password"
          required
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          action={<Link to="/forgot-password" className="auth-link">Forgot password?</Link>}
        />
        <button type="submit" className="auth-submit" disabled={loading} aria-busy={loading}>
          {loading ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </AuthLayout>
  );
}

export default Login;
