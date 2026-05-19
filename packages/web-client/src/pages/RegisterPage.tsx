import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useNavigate } from "react-router";
import { AUTH_USER_STORAGE_KEY, signUp } from "@/lib/authApi";
import { MetaIcon } from "@/components/MetaIcon";

type FieldProps = {
  label: string;
  icon: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#18181B] px-4 py-8">
      <section
        className="relative z-10 mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[320px] flex-col items-center justify-center gap-12"
        aria-label="Create account"
      >
        <div
          className="flex h-[42px] w-12 items-center justify-center"
          aria-hidden="true"
        >
          <MetaIcon className="h-[42px] w-12" />
        </div>

        <form
          className="flex w-full max-w-[320px] flex-col gap-8 rounded-lg bg-[#27272a] p-6 text-[#e4e4e7] shadow-[0_18px_32px_rgba(0,0,0,0.24)] max-[420px]:gap-8"
          autoComplete="off"
          onSubmit={async (event) => {
            event.preventDefault();
            setErrorMessage("");

            if (password !== confirmPassword) {
              setErrorMessage("Passwords do not match");
              return;
            }

            setIsSubmitting(true);
            try {
              const normalizedEmail = email.trim();
              const normalizedUsername = username.trim();

              await signUp({
                email: normalizedEmail,
                username: normalizedUsername,
                password,
                confirmPassword,
              });

              localStorage.setItem(
                AUTH_USER_STORAGE_KEY,
                JSON.stringify({
                  username: normalizedUsername,
                  email: normalizedEmail,
                })
              );

              navigate("/verify", {
                state: { email: normalizedEmail },
              });
            } catch (error) {
              setErrorMessage(
                error instanceof Error
                  ? error.message
                  : "Unable to create account"
              );
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <header>
            <h1 className="m-0 text-[20px] leading-6 font-semibold">
              Register
            </h1>
            <p className="mt-3 text-base leading-6 text-[#d4d4d8]">
              Fill in the details below to create your account
            </p>
          </header>

          <Field
            label="E-Mail"
            icon={<Mail size={16} />}
            type="email"
            placeholder="youremail@example.com"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />

          <Field
            label="Username"
            icon={<User size={16} />}
            type="text"
            placeholder="User01"
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />

          <Field
            label="Password"
            icon={<Lock size={16} />}
            type={showPassword ? "text" : "password"}
            placeholder="********"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            action={
              <button
                type="button"
                className="grid h-5 w-5 place-items-center bg-transparent p-0 text-[#a1a1aa] transition-colors hover:text-[#e4e4e7] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#facc1566]"
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
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            action={
              <button
                type="button"
                className="grid h-5 w-5 place-items-center bg-transparent p-0 text-[#a1a1aa] transition-colors hover:text-[#e4e4e7] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#facc1566]"
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
                onClick={() => setShowConfirmPassword((value) => !value)}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          <div className="flex flex-col gap-4">
            {errorMessage ? (
              <p className="rounded-md border border-[#ef4444]/45 bg-[#450a0a] px-3 py-2 text-sm leading-5 text-[#fecaca]">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-9 w-full cursor-pointer rounded-lg border border-transparent bg-[#facc15] px-3 py-2 text-sm leading-5 font-medium text-[#09090b] transition-[transform,filter] duration-120 hover:-translate-y-px hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#facc1566]"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>

            <button
              type="button"
              className="min-h-9 w-full cursor-pointer rounded-lg border border-[#3f3f46] bg-[rgba(255,255,255,0.05)] px-3 py-2 text-sm leading-5 font-medium text-[#fafafa] transition-[transform,filter] duration-120 hover:-translate-y-px hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#facc1566]"
              onClick={() => {
                navigate("/login");
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

function Field({
  label,
  icon,
  action,
  ...props
}: FieldProps & { action?: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm leading-5 font-medium text-[#fafafa]">
        {label}
      </span>

      <span className="flex h-9 min-h-9 items-center gap-2 rounded-lg border border-[#3f3f46] bg-[rgba(255,255,255,0.05)] px-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <span
          className="grid h-5 w-5 flex-none place-items-center text-[#a1a1aa]"
          aria-hidden="true"
        >
          {icon}
        </span>

        <input
          className="w-full border-0 bg-transparent text-sm leading-5 text-[#e4e4e7] outline-none placeholder:text-[#a1a1aa]"
          {...props}
        />

        {action ? (
          <span className="ml-auto grid place-items-center">{action}</span>
        ) : null}
      </span>
    </label>
  );
}
