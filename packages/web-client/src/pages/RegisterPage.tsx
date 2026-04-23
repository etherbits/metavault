import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { navigateTo } from "../lib/navigation";
import "./register-page.css";

type FieldProps = {
  label: string;
  icon: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <main className="register-page">
      <div className="register-shell" aria-hidden="true" />

      <section className="register-content" aria-label="Create account">
        <div className="register-logo" aria-hidden="true">
          M
        </div>

        <form
          className="register-card"
          onSubmit={(event) => {
            event.preventDefault();
            navigateTo("/app");
          }}
        >
          <header className="register-header">
            <h1>Register</h1>
            <p>Fill in the details below to create your account</p>
          </header>

          <Field
            label="E-Mail"
            icon={<Mail size={16} />}
            type="email"
            placeholder="youremail@example.com"
            autoComplete="email"
            required
          />

          <Field
            label="Username"
            icon={<User size={16} />}
            type="text"
            placeholder="User01"
            autoComplete="username"
            required
          />

          <Field
            label="Password"
            icon={<Lock size={16} />}
            type={showPassword ? "text" : "password"}
            placeholder="********"
            autoComplete="new-password"
            required
            action={
              <button
                type="button"
                className="field-icon-button"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          <Field
            label="Confirm Password"
            icon={<Lock size={16} />}
            type={showConfirmPassword ? "text" : "password"}
            placeholder="********"
            autoComplete="new-password"
            required
            action={
              <button
                type="button"
                className="field-icon-button"
                aria-label={
                  showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                }
                onClick={() => setShowConfirmPassword((value) => !value)}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          <div className="register-actions">
            <button type="submit" className="primary-button">
              Create account
            </button>

            <button
              type="button"
              className="secondary-button"
              onClick={() => {
                navigateTo("/login");
              }}
            >
              Switch to login
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

function Field({ label, icon, action, ...props }: FieldProps & { action?: ReactNode }) {
  return (
    <label className="register-field">
      <span className="register-label">{label}</span>

      <span className="register-input-wrap">
        <span className="field-icon" aria-hidden="true">
          {icon}
        </span>

        <input className="register-input" {...props} />

        {action ? <span className="field-action">{action}</span> : null}
      </span>
    </label>
  );
}
