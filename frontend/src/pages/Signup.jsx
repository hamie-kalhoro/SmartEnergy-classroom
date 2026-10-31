import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../api";
import AuthLayout, { AuthField, AuthNotice, PasswordField } from "../components/AuthLayout";

const ROLES = [
  { key: "user", label: "Student", desc: "View classroom schedules." },
  { key: "faculty", label: "Faculty", desc: "View schedules and run batch predictions. Needs administrator approval." },
  { key: "assistant", label: "Lab Assistant", desc: "Look after one lab or classroom. Needs administrator approval." },
];

function Signup() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    role: "user",
    classroom_id: "",
  });
  const [vacantRooms, setVacantRooms] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const isAssistant = formData.role === "assistant";

  useEffect(() => {
    if (!isAssistant || vacantRooms) return;
    api.get("/api/signup/vacant-rooms")
      .then((res) => setVacantRooms(res.data))
      .catch(() => setError("Could not load the list of labs. Please try again."));
  }, [isAssistant, vacantRooms]);

  const updateField = (field) => (e) => setFormData({ ...formData, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await api.post("/api/signup", {
        ...formData,
        username: formData.username.trim(),
        email: formData.email.trim(),
      });
      if (res.data.success) setResult(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not create your account. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    const roomName = vacantRooms?.find((r) => String(r.id) === String(formData.classroom_id))?.name;
    let title = "Check your email";
    let body = <>We've sent an activation link to <strong>{formData.email.trim()}</strong>. Open it to activate your account.</>;
    if (result.pending) {
      title = "Request sent for approval";
      body = isAssistant
        ? <>An administrator needs to approve your lab assistant request for <strong>{roomName}</strong>. You can sign in once they do.</>
        : <>An administrator needs to approve your faculty access. You can sign in once they do.</>;
    } else if (!result.email_sent) {
      title = "Account created, email not sent";
      body = <>We couldn't send the activation link to <strong>{formData.email.trim()}</strong>. You can request a new one from the sign-in page, or ask an administrator to activate your account.</>;
    }
    return (
      <AuthLayout title={title}>
        <p className="auth-text">{body}</p>
        <Link to="/login" className="auth-submit">Go to sign in</Link>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Enter your details and choose your account type."
      footer={
        <>
          Already have an account? <Link to="/login" className="auth-link">Sign in</Link>
        </>
      }>
      {error && <AuthNotice tone="error">{error}</AuthNotice>}

      <form onSubmit={handleSubmit}>
        <AuthField
          id="signup-name"
          label="Full name"
          name="name"
          type="text"
          autoComplete="name"
          maxLength={80}
          required
          value={formData.username}
          onChange={updateField("username")}
        />
        <AuthField
          id="signup-email"
          label="Email address"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={120}
          required
          value={formData.email}
          onChange={updateField("email")}
        />
        <PasswordField
          id="signup-password"
          label="Password"
          name="password"
          autoComplete="new-password"
          hint="Use at least 8 characters."
          meter
          minLength={8}
          required
          value={formData.password}
          onChange={updateField("password")}
        />

        <fieldset className="auth-choices">
          <legend className="auth-legend">Account type</legend>
          {ROLES.map((role) => (
            <label key={role.key} className="auth-choice">
              <input
                type="radio"
                name="role"
                value={role.key}
                checked={formData.role === role.key}
                onChange={updateField("role")}
              />
              <span>
                <strong>{role.label}</strong>
                <small>{role.desc}</small>
              </span>
            </label>
          ))}
        </fieldset>

        {isAssistant && (
          <div className="auth-field">
            <div className="auth-label-row">
              <label htmlFor="signup-room">Lab or classroom</label>
            </div>
            <select
              id="signup-room"
              className="auth-input"
              aria-describedby="signup-room-hint"
              required
              value={formData.classroom_id}
              onChange={updateField("classroom_id")}>
              <option value="">{vacantRooms ? "Select a room" : "Loading rooms..."}</option>
              {vacantRooms?.map((room) => (
                <option key={room.id} value={room.id}>{room.name}</option>
              ))}
            </select>
            <p id="signup-room-hint" className="auth-hint">
              {vacantRooms?.length === 0
                ? "Every room already has an assistant. Please contact an administrator."
                : "Only rooms without an assistant are listed."}
            </p>
          </div>
        )}

        <button
          type="submit"
          className="auth-submit"
          disabled={loading || (isAssistant && !vacantRooms?.length)}
          aria-busy={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </AuthLayout>
  );
}

export default Signup;
