import React, { useState, useEffect } from "react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import api from "../api";
import {
  FiMail,
  FiLock,
  FiCheckCircle,
  FiZap,
  FiArrowRight,
  FiArrowLeft,
} from "react-icons/fi";
import useTypewriter from "../hooks/useTypewriter";

function Login({ onLogin }) {
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activated, setActivated] = useState(false);

  // Dynamic Placeholders Configurations
  const txtUser = "Enter your login ID";
  const txtPass = "SecretPass123";
  const SPEED = 80;
  // Calculate total cycle based on longest text + 2s pause
  const maxLen = Math.max(txtUser.length, txtPass.length);
  const totalCycle = maxLen * SPEED + 2000;

  const placeholderUser = useTypewriter(txtUser, false, SPEED, 0, totalCycle);
  const placeholderPass = useTypewriter(txtPass, true, SPEED, 0, totalCycle);

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.search.includes("activated=true")) {
      setActivated(true);
      window.history.replaceState({}, document.title, "/login");
    }
  }, [location]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/login", formData);
      if (res.data.success) {
        // Combine user info and token for storage
        onLogin({ ...res.data.user, token: res.data.token });
        navigate("/");
      }
    } catch (err) {
      setError(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-vh-100 d-flex align-items-center justify-content-center p-4"
      style={{ background: "var(--bg-deep)" }}>
      {/* Background Effects */}
      <div
        style={{
          position: "fixed",
          top: "-50%",
          left: "-50%",
          width: "200%",
          height: "200%",
          background:
            "radial-gradient(ellipse at 30% 20%, rgba(124, 58, 237, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, rgba(6, 182, 212, 0.05) 0%, transparent 50%)",
          pointerEvents: "none",
        }}
      />

      {/* Back Arrow */}
      <Link
        to="/"
        style={{
          position: "fixed",
          top: "24px",
          left: "28px",
          display: "inline-flex",
          alignItems: "center",
          gap: "8px",
          color: "var(--text-secondary, #94a3b8)",
          textDecoration: "none",
          fontSize: "0.9rem",
          zIndex: 10,
          transition: "color 0.2s ease",
        }}
        onMouseEnter={(e) =>
          (e.currentTarget.style.color = "var(--text-primary, #e2e8f0)")
        }
        onMouseLeave={(e) =>
          (e.currentTarget.style.color = "var(--text-secondary, #94a3b8)")
        }>
        <FiArrowLeft style={{ fontSize: "1.2rem" }} />
        Back to Home
      </Link>

      <div
        className="fade-in"
        style={{ maxWidth: "440px", width: "100%", position: "relative" }}>
        {/* Logo */}
        <div className="text-center mb-5">
          <div
            className="d-inline-flex align-items-center justify-content-center mb-4"
            style={{
              background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
              borderRadius: "20px",
              padding: "18px",
              boxShadow: "0 0 40px rgba(124, 58, 237, 0.4)",
            }}>
            <FiZap style={{ fontSize: "2rem", color: "white" }} />
          </div>
          <h1 className="fw-bold mb-2" style={{ letterSpacing: "-0.03em" }}>
            Welcome <span className="text-gradient">Back</span>
          </h1>
          <p className="text-muted">
            Sign in to access your energy command center
          </p>
        </div>

        {/* Activation Success */}
        {activated && (
          <div
            className="mb-4 p-4 rounded-3 d-flex align-items-center gap-3 fade-in"
            style={{
              background: "rgba(16, 185, 129, 0.1)",
              border: "1px solid rgba(16, 185, 129, 0.2)",
            }}>
            <FiCheckCircle style={{ fontSize: "1.5rem", color: "#10b981" }} />
            <div>
              <div className="fw-bold" style={{ color: "#10b981" }}>
                Account Activated!
              </div>
              <div className="small text-muted">You can now sign in below</div>
            </div>
          </div>
        )}

        {/* Login Card */}
        <div
          className="card"
          style={{ background: "var(--bg-surface)", padding: "2.5rem" }}>
          {error && (
            <div
              className="mb-4 p-3 rounded-3"
              style={{
                background: "rgba(239, 68, 68, 0.1)",
                color: "#f87171",
                fontSize: "0.875rem",
              }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label">Email or Username</label>
              <div style={{ position: "relative" }}>
                <FiMail
                  style={{
                    position: "absolute",
                    left: "1rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  type="text"
                  className="form-control"
                  placeholder={placeholderUser}
                  style={{ paddingLeft: "2.75rem" }}
                  required
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="mb-5">
              <label className="form-label">Password</label>
              <div style={{ position: "relative" }}>
                <FiLock
                  style={{
                    position: "absolute",
                    left: "1rem",
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--text-muted)",
                  }}
                />
                <input
                  type="password"
                  className="form-control"
                  placeholder={placeholderPass}
                  style={{ paddingLeft: "2.75rem" }}
                  required
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-gradient w-100 py-3 mb-4"
              disabled={loading}
              style={{ fontSize: "1rem", fontWeight: "600" }}>
              {loading ? (
                <span className="spinner-border spinner-border-sm"></span>
              ) : (
                <>
                  Sign In <FiArrowRight className="ms-2" />
                </>
              )}
            </button>
          </form>

          <div className="text-center">
            <span className="text-muted small">Don't have an account? </span>
            <Link
              to="/signup"
              className="text-gradient fw-bold small"
              style={{ textDecoration: "none" }}>
              Create Account
            </Link>
          </div>
        </div>

        <p
          className="text-center text-muted small mt-4"
          style={{ opacity: 0.5 }}>
          © 2026 SmartEnergy FYP Project
        </p>
      </div>
    </div>
  );
}

export default Login;
