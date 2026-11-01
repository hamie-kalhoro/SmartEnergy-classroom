import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import AuthLayout, { AuthNotice, PasswordField } from "../components/AuthLayout";

function ResetPassword({ signedInAs, onPasswordChanged }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [token] = useState(() => new URLSearchParams(location.search).get("token"));
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Keeps the reset token out of the browser history and address bar.
  useEffect(() => {
    if (token) window.history.replaceState({}, document.title, "/reset-password");
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password !== confirmation) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/api/reset-password", { token, password });
      // The saved session may belong to the old password or another account.
      if (signedInAs) onPasswordChanged();
      navigate("/login?reset=true");
    } catch (err) {
      setError(err.response?.data?.message || "Could not change your password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const footer = <Link to="/forgot-password" className="auth-link">Request a new reset link</Link>;

  if (!token) {
    return (
      <AuthLayout title="Reset link missing" footer={footer}>
        <p className="auth-text" style={{ marginBottom: 0 }}>Open the full link from your email, or request a new one.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Choose a new password" footer={footer}>
      {signedInAs && !error && (
        <AuthNotice>
          This browser is signed in as <strong>{signedInAs}</strong>. Changing the password will sign it out.
        </AuthNotice>
      )}
      {error && <AuthNotice tone="error">{error}</AuthNotice>}
      <form onSubmit={handleSubmit}>
        <PasswordField
          id="reset-password"
          label="New password"
          name="new-password"
          autoComplete="new-password"
          hint="Use at least 8 characters."
          meter
          minLength={8}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <PasswordField
          id="reset-confirmation"
          label="Confirm new password"
          name="confirm-password"
          autoComplete="new-password"
          required
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
        />
        <button type="submit" className="auth-submit" disabled={loading} aria-busy={loading}>
          {loading ? "Changing password..." : "Change password"}
        </button>
      </form>
    </AuthLayout>
  );
}

export default ResetPassword;
