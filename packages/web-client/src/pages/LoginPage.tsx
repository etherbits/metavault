import { useState } from "react";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { navigateTo } from "../lib/navigation";
import "./login-page.css";

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <main className="login-page">
      <div className="login-shell" aria-hidden="true" />

      <section className="login-content" aria-label="Log in to account">
        <div className="login-logo" aria-hidden="true">
          M
        </div>

        <form
          className="login-card"
          onSubmit={(event) => {
            event.preventDefault();
            navigateTo("/app");
          }}
        >
          <header className="login-header">
            <h1>Log In</h1>
            <p>Fill in the details below to log into your account</p>
          </header>

          <label className="login-field">
            <span className="login-label">Username</span>

            <span className="login-input-wrap">
              <span className="field-icon" aria-hidden="true">
                <User size={16} />
              </span>

              <input
                className="login-input"
                type="text"
                placeholder="User01"
                autoComplete="username"
                required
              />
            </span>
          </label>

          <label className="login-field">
            <span className="login-label">Password</span>

            <span className="login-input-wrap">
              <span className="field-icon" aria-hidden="true">
                <Lock size={16} />
              </span>

              <input
                className="login-input"
                type={showPassword ? "text" : "password"}
                placeholder="********"
                autoComplete="current-password"
                required
              />

              <button
                type="button"
                className="field-icon-button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>

          <div className="login-actions">
            <button type="submit" className="primary-button">
              Log In
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                navigateTo("/register");
              }}
            >
              Switch to registration
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
