import { useState } from "react";
import { Eye, EyeOff, Lock, User } from "lucide-react";
import { useNavigate } from "react-router";
import { AUTH_STORAGE_KEY, AUTH_USER_STORAGE_KEY, signIn } from "@/lib/authApi";
import MetaLogo from "@/assets/Meta.svg";

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#11141b_0%,#18181b_52%)] px-4 py-8">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(250,204,21,0.03),transparent_40%)]"
        aria-hidden="true"
      />

      <section
        className="relative z-10 mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[352px] flex-col items-center justify-center gap-10"
        aria-label="Log in to account"
      >
        <img
          src={MetaLogo}
          alt="MetaVault"
          className="h-[42px] w-12 object-contain"
        />

        <form
          className="flex w-full flex-col gap-7 rounded-xl bg-[#27272a] p-6 text-[#e4e4e7] shadow-[0_18px_32px_rgba(0,0,0,0.24)]"
          autoComplete="off"
          onSubmit={async (event) => {
            event.preventDefault();
            setErrorMessage("");
            setIsSubmitting(true);

            try {
              const response = await signIn({
                username: username.trim(),
                password,
              });
              const typedUsername = username.trim();
              const resolvedUsername =
                response.user?.username?.trim() || typedUsername;
              const resolvedEmail = response.user?.email?.trim() || "";
              localStorage.setItem(AUTH_STORAGE_KEY, "true");
              localStorage.setItem(
                AUTH_USER_STORAGE_KEY,
                JSON.stringify({
                  name: resolvedUsername,
                  username: resolvedUsername,
                  email: resolvedEmail,
                })
              );
              localStorage.setItem("metavault.username", resolvedUsername);
              localStorage.setItem("metavault.email", resolvedEmail);
              navigate("/app");
            } catch (error) {
              setErrorMessage(
                error instanceof Error ? error.message : "Unable to sign in"
              );
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <header>
            <h1 className="m-0 text-[20px] leading-6 font-semibold">Log in</h1>
            <p className="mt-3 text-base leading-6 text-[#d4d4d8]">
              Fill in the details below to log into your account
            </p>
          </header>

          <label className="flex flex-col gap-1">
            <span className="text-sm leading-5 font-medium text-[#fafafa]">
              Username or email
            </span>

            <span className="flex h-9 min-h-9 items-center gap-2 rounded-lg border border-[#3f3f46] bg-[rgba(255,255,255,0.05)] px-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <span
                className="grid h-5 w-5 flex-none place-items-center text-[#a1a1aa]"
                aria-hidden="true"
              >
                <User size={16} />
              </span>

              <input
                className="w-full border-0 bg-transparent text-sm leading-5 text-[#e4e4e7] outline-none placeholder:text-[#a1a1aa]"
                type="text"
                placeholder="User01 or you@example.com"
                autoComplete="off"
                name="login-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
              />
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm leading-5 font-medium text-[#fafafa]">
              Password
            </span>

            <span className="flex h-9 min-h-9 items-center gap-2 rounded-lg border border-[#3f3f46] bg-[rgba(255,255,255,0.05)] px-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <span
                className="grid h-5 w-5 flex-none place-items-center text-[#a1a1aa]"
                aria-hidden="true"
              >
                <Lock size={16} />
              </span>

              <input
                className="w-full border-0 bg-transparent text-sm leading-5 text-[#e4e4e7] outline-none placeholder:text-[#a1a1aa]"
                type={showPassword ? "text" : "password"}
                placeholder="********"
                autoComplete="new-password"
                name="login-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />

              <button
                type="button"
                className="grid h-5 w-5 place-items-center bg-transparent p-0 text-[#a1a1aa] transition-colors hover:text-[#e4e4e7] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#facc1566]"
                aria-label={showPassword ? "Hide password" : "Show password"}
                onClick={() => setShowPassword((value) => !value)}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </span>
          </label>

          <div className="flex flex-col gap-4">
            {errorMessage ? (
              <p className="rounded-md border border-[#ef4444]/45 bg-[#450a0a] px-3 py-2 text-sm leading-5 text-[#fecaca]">
                {errorMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-9 w-full cursor-pointer rounded-lg border border-transparent bg-[#facc15] px-3 py-2 text-sm leading-5 font-medium text-[#09090b] transition-[transform,filter,opacity] duration-120 hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#facc1566]"
            >
              {isSubmitting ? "Logging in..." : "Log In"}
            </button>

            <button
              type="button"
              className="min-h-9 w-full cursor-pointer rounded-lg border border-[#3f3f46] bg-[rgba(255,255,255,0.05)] px-3 py-2 text-sm leading-5 font-medium text-[#fafafa] transition-[transform,filter] duration-120 hover:-translate-y-px hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#facc1566]"
              onClick={() => {
                navigate("/register");
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
