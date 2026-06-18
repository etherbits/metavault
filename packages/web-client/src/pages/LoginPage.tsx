import { Eye, EyeOff, Lock, User } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router";
import { MetaIcon } from "@/components/MetaIcon";
import { Button } from "@/components/ui/button";
import { useSignIn } from "@/features/auth/hooks";

export function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const signInMutation = useSignIn();
  const navigate = useNavigate();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#18181B] px-4 py-8">
      <section
        className="relative z-10 mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[320px] flex-col items-center justify-center gap-12"
        aria-label="Log in to account"
      >
        <div
          className="flex h-[42px] w-12 items-center justify-center"
          aria-hidden="true"
        >
          <MetaIcon className="h-[42px] w-12" />
        </div>

        <form
          className="flex w-full max-w-[320px] flex-col gap-6 rounded-lg bg-[#27272a] p-6 text-[#e4e4e7] shadow-[0_18px_32px_rgba(0,0,0,0.24)] max-[420px]:gap-5 max-[420px]:p-5"
          autoComplete="off"
          onSubmit={async (event) => {
            event.preventDefault();
            setErrorMessage("");

            try {
              await signInMutation.mutateAsync({
                username: username.trim(),
                password,
              });
              navigate("/app");
            } catch (error) {
              setErrorMessage(
                error instanceof Error ? error.message : "Unable to sign in"
              );
            }
          }}
        >
          <header>
            <h1 className="m-0 text-[20px] leading-6 font-semibold">Log In</h1>
            <p className="mt-3 text-base leading-6 text-[#d4d4d8]">
              Fill in the details below to log into your account
            </p>
          </header>

          <label className="flex flex-col gap-1">
            <span className="text-sm leading-5 font-medium text-[#fafafa]">
              Username
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
                name="login-username"
                placeholder="User01"
                autoComplete="off"
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
                name="login-password"
                placeholder="********"
                autoComplete="new-password"
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

          <div className="-mt-4 flex justify-end">
            <button
              type="button"
              className="text-sm leading-5 font-medium text-[#facc15] transition-colors hover:text-[#fde047] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#facc1566]"
              onClick={() => navigate("/forgot-password")}
            >
              Forgot password?
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {errorMessage ? (
              <p className="rounded-md border border-[#ef4444]/45 bg-[#450a0a] px-3 py-2 text-sm leading-5 text-[#fecaca]">
                {errorMessage}
              </p>
            ) : null}

            <Button
              type="submit"
              variant="brand"
              disabled={signInMutation.isPending}
              className="min-h-9 w-full"
            >
              {signInMutation.isPending ? "Logging in..." : "Log In"}
            </Button>

            <Button
              type="button"
              variant="surface"
              className="min-h-9 w-full"
              onClick={() => {
                navigate("/register");
              }}
            >
              Switch to registration
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}
