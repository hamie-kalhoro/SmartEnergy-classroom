import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";
import {
  FiUser,
  FiMail,
  FiLock,
  FiZap,
  FiArrowRight,
  FiArrowLeft,
  FiCheck,
  FiUsers,
  FiShield,
  FiBookOpen,
} from "react-icons/fi";
import useTypewriter from "../hooks/useTypewriter";
import DynamicLoader from "../components/DynamicLoader";

function Signup() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Dynamic Placeholders
  const txtName = "John Doe";
  const txtEmail = "you@example.com";
  const txtPass = "SecureP@ss!";
  const SPEED = 80;

  const maxLen = Math.max(txtName.length, txtEmail.length, txtPass.length);
  const totalCycle = maxLen * SPEED + 2000;

  const placeholderName = useTypewriter(txtName, false, SPEED, 0, totalCycle);
  const placeholderEmail = useTypewriter(txtEmail, false, SPEED, 0, totalCycle);
  const placeholderPass = useTypewriter(txtPass, true, SPEED, 0, totalCycle);

  const navigate = useNavigate();

  const roles = [
    {
      key: "user",
      label: "Student",
      desc: "View classroom schedules",
      icon: <FiUsers />,
    },
    {
      key: "faculty",
      label: "Faculty",
      desc: "Manage your classes",
      icon: <FiBookOpen />,
    },
    {
      key: "admin",
      label: "Administrator",
      desc: "Full system access",
      icon: <FiShield />,
    },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/signup", formData);
      if (res.data.success) {
        setSuccess(true);
      }
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    const isAdminPending = formData.role === "admin";
    return (
      <div
        className="min-vh-100 d-flex align-items-center justify-content-center p-4"
        style={{ background: "var(--bg-deep)" }}>
        <div className="fade-in text-center" style={{ maxWidth: "480px" }}>
          <div
            className="d-inline-flex align-items-center justify-content-center mb-4"
            style={{
              background: isAdminPending
                ? "linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)"
                : "linear-gradient(135deg, #10b981 0%, #34d399 100%)",
              borderRadius: "50%",
              padding: "24px",
              boxShadow: `0 0 50px ${isAdminPending ? "rgba(245, 158, 11, 0.4)" : "rgba(16, 185, 129, 0.4)"}`,
            }}>
            {isAdminPending ? (
              <FiShield style={{ fontSize: "2.5rem", color: "white" }} />
            ) : (
              <FiCheck style={{ fontSize: "2.5rem", color: "white" }} />
            )}
          </div>
          <h2 className="fw-bold mb-3" style={{ letterSpacing: "-0.03em" }}>
            {isAdminPending ? "Access Pending Approval" : "Check Your Email"}
          </h2>
          <p className="text-muted mb-5" style={{ fontSize: "1.05rem" }}>
            {isAdminPending ? (
              <>
                Administrative requests require verification. Existing
                administrators have been notified of your request for{" "}
                <span className="text-primary fw-bold">
                  {formData.username}
                </span>
                .
              </>
            ) : (
              <>
                We've sent an activation link to{" "}
                <span className="text-primary fw-bold">{formData.email}</span>.
                Click the link to activate your account.
              </>
            )}
          </p>
          <Link to="/login" className="btn btn-gradient py-3 px-5">
            Go to Login <FiArrowRight className="ms-2" />
          </Link>
        </div>
      </div>
    );
  }

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
            "radial-gradient(ellipse at 70% 30%, rgba(0, 210, 106, 0.07) 0%, transparent 50%), radial-gradient(ellipse at 30% 70%, rgba(6, 182, 212, 0.05) 0%, transparent 50%)",
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
        style={{ maxWidth: "500px", width: "100%", position: "relative" }}>
        {/* Logo */}
        <div className="text-center mb-5">
          <div
            className="d-inline-flex align-items-center justify-content-center mb-4"
            style={{
              background: "linear-gradient(135deg, #00d26a 0%, #06b6d4 100%)",
              borderRadius: "16px",
              padding: "18px",
              boxShadow: "0 8px 32px rgba(0, 210, 106, 0.35)",
            }}>
            <FiZap style={{ fontSize: "2rem", color: "white" }} />
          </div>
          <h1 className="fw-bold mb-2" style={{ letterSpacing: "-0.03em" }}>
            Create <span className="text-gradient">Account</span>
          </h1>
          <p className="text-muted">Join the smart energy revolution</p>
        </div>

        {/* Progress Steps */}
        <div className="d-flex justify-content-center gap-2 mb-5">
          {[1, 2].map((s) => (
            <div
              key={s}
              style={{
                width: step >= s ? "40px" : "12px",
                height: "4px",
                borderRadius: "10px",
                background:
                  step >= s ? "var(--gradient-primary)" : "var(--bg-elevated)",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>

        {/* Card */}
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

          {step === 1 ? (
            <div>
              <h5 className="fw-bold mb-4">Select Your Role</h5>
              <div className="d-flex flex-column gap-3 mb-4">
                {roles.map((r) => (
                  <div
                    key={r.key}
                    onClick={() => setFormData({ ...formData, role: r.key })}
                    className="d-flex align-items-center gap-3 p-4 rounded-3 cursor-pointer role-card"
                    style={{
                      background:
                        formData.role === r.key
                          ? "rgba(0, 210, 106, 0.12)"
                          : "var(--bg-elevated)",
                      border: `2px solid ${formData.role === r.key ? "var(--primary)" : "transparent"}`,
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      position: 'relative',
                      overflow: 'hidden'
                    }}>
                    <div
                      style={{
                        width: "48px",
                        height: "48px",
                        borderRadius: "12px",
                        background:
                          formData.role === r.key
                            ? "var(--gradient-primary)"
                            : "rgba(255,255,255,0.03)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color:
                          formData.role === r.key
                            ? "white"
                            : "var(--text-muted)",
                        fontSize: "1.25rem",
                        boxShadow: formData.role === r.key ? '0 4px 15px rgba(0, 210, 106, 0.3)' : 'none'
                      }}>
                      {r.icon}
                    </div>
                    <div className="flex-grow-1">
                      <div className="fw-bold mb-0" style={{
                        color: formData.role === r.key ? 'var(--primary-light)' : 'var(--text)',
                        fontSize: '1.1rem',
                        letterSpacing: '-0.01em'
                      }}>
                        {r.label}
                      </div>
                      <div className="small" style={{
                        color: formData.role === r.key ? 'white' : 'var(--text-muted)',
                        opacity: formData.role === r.key ? 0.9 : 0.7
                      }}>
                        {r.desc}
                      </div>
                    </div>
                    <div
                      style={{
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        border: `2px solid ${formData.role === r.key ? "var(--primary)" : "rgba(255,255,255,0.15)"}`,
                        background:
                          formData.role === r.key ? "var(--primary)" : "transparent",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        transition: 'all 0.3s ease'
                      }}>
                      {formData.role === r.key && (
                        <FiCheck
                          style={{ color: "white", fontSize: "0.75rem" }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                className="btn btn-gradient w-100 py-3"
                onClick={() => setStep(2)}>
                Continue <FiArrowRight className="ms-2" />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <h5 className="fw-bold mb-4">Your Details</h5>

              <div className="mb-4">
                <label className="form-label">Full Name</label>
                <div style={{ position: "relative" }}>
                  <FiUser
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
                    placeholder={placeholderName}
                    style={{ paddingLeft: "2.75rem" }}
                    required
                    onChange={(e) =>
                      setFormData({ ...formData, username: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label">Email Address</label>
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
                    type="email"
                    className="form-control"
                    placeholder={placeholderEmail}
                    style={{ paddingLeft: "2.75rem" }}
                    required
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
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
                    minLength={6}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="d-flex gap-3">
                <button
                  type="button"
                  className="btn btn-primary-dim flex-grow-1 py-3"
                  onClick={() => setStep(1)}>
                  Back
                </button>
                <button
                  type="submit"
                  className="btn btn-gradient flex-grow-1 py-3"
                  disabled={loading}>
                  {loading ? (
                    <DynamicLoader size={24} color="var(--bg-deep)" />
                  ) : (
                    "Create Account"
                  )}
                </button>
              </div>
            </form>
          )}

          <div className="text-center mt-4">
            <span className="text-muted small">Already have an account? </span>
            <Link
              to="/login"
              className="text-gradient fw-bold small"
              style={{ textDecoration: "none" }}>
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Signup;
