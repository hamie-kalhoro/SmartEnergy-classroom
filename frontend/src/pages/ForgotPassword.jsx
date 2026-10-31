import React, { useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import AuthLayout, { AuthField, AuthNotice } from "../components/AuthLayout";

function ForgotPassword() {
  const [login, setLogin] = useState("");
  const [error, setError] = useState("");
  const [sentMessage, setSentMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/forgot-password", { login });
      setSentMessage(res.data.message);
    } catch (err) {
      setError(err.response?.data?.message || "Could not send the email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const footer = <Link to="/login" className="auth-link">Back to sign in</Link>;

  if (sentMessage) {
    return (
      <AuthLayout title="Check your email" footer={footer}>
        <p className="auth-text">{sentMessage}</p>
        <p className="auth-hint">The link expires in 1 hour. Can't find it? Check your spam folder.</p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Reset your password"
      subtitle="Enter your email or username and we'll send you a reset link."
      footer={footer}>
      {error && <AuthNotice tone="error">{error}</AuthNotice>}
      <form onSubmit={handleSubmit}>
        <AuthField
          id="forgot-login"
          label="Email or username"
          name="username"
          type="text"
          autoComplete="username"
          required
          value={login}
          onChange={(e) => setLogin(e.target.value)}
        />
        <button type="submit" className="auth-submit" disabled={loading} aria-busy={loading}>
          {loading ? "Sending..." : "Send reset link"}
        </button>
      </form>
    </AuthLayout>
  );
}

export default ForgotPassword;
