import { useState, type InputHTMLAttributes, type ReactNode } from "react";
import { Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

type FieldProps = {
  label: string;
  icon: ReactNode;
} & InputHTMLAttributes<HTMLInputElement>;

export function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const navigate = useNavigate();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#11141b_0%,#18181b_52%)] px-4 py-8">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(250,204,21,0.03),transparent_40%)]"
        aria-hidden="true"
      />

      <section
        className="relative z-10 grid min-h-[calc(100vh-64px)] place-items-center gap-12 max-[420px]:gap-[30px]"
        aria-label="Create account"
      >
        <div
          className="font-heading text-[74px] leading-none font-extrabold tracking-[-0.06em] text-[#facc15] max-[420px]:text-[62px]"
          aria-hidden="true"
        >
          M
        </div>

        <form
          className="flex w-full max-w-[320px] flex-col gap-6 rounded-lg bg-[#27272a] p-6 text-[#e4e4e7] shadow-[0_18px_32px_rgba(0,0,0,0.24)] max-[420px]:gap-5 max-[420px]:p-5"
          onSubmit={(event) => {
            event.preventDefault();
            navigate("/app");
          }}
        >
          <header>
            <h1 className="m-0 text-xl leading-tight font-semibold">Register</h1>
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
            required
            action={
              <button
                type="button"
                className="grid h-5 w-5 place-items-center bg-transparent p-0 text-[#a1a1aa] transition-colors hover:text-[#e4e4e7] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#facc1566]"
                aria-label={
                  showConfirmPassword ? "Hide confirm password" : "Show confirm password"
                }
                onClick={() => setShowConfirmPassword((value) => !value)}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            }
          />

          <div className="flex flex-col gap-4 pt-2">
            <button
              type="submit"
              className="min-h-9 w-full cursor-pointer rounded-lg border border-transparent bg-[#facc15] px-3 py-2 text-sm leading-5 font-medium text-[#09090b] transition-[transform,filter] duration-120 hover:-translate-y-px hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#facc1566]"
            >
              Create account
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

function Field({ label, icon, action, ...props }: FieldProps & { action?: ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm leading-5 font-medium text-[#fafafa]">{label}</span>

      <span className="flex min-h-9 items-center gap-2 rounded-lg border border-[#3f3f46] bg-[rgba(255,255,255,0.05)] px-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
        <span className="grid h-5 w-5 flex-none place-items-center text-[#a1a1aa]" aria-hidden="true">
          {icon}
        </span>

        <input
          className="w-full border-0 bg-transparent text-sm leading-5 text-[#e4e4e7] outline-none placeholder:text-[#a1a1aa]"
          {...props}
        />

        {action ? <span className="ml-auto grid place-items-center">{action}</span> : null}
      </span>
    </label>
  );
}
