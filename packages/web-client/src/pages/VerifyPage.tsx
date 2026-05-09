import { useState } from "react";
import { KeyRound, Mail } from "lucide-react";
import { useLocation, useNavigate } from "react-router";
import { resendVerificationCode, verifyUser } from "@/lib/authApi";

export function VerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefilledEmail =
    typeof location.state === "object" &&
    location.state !== null &&
    "email" in location.state
      ? String((location.state as { email?: string }).email ?? "")
      : "";

  const [email, setEmail] = useState(prefilledEmail);
  const [otpCode, setOtpCode] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_50%_0%,#11141b_0%,#18181b_52%)] px-4 py-8">
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(250,204,21,0.03),transparent_40%)]"
        aria-hidden="true"
      />

      <section
        className="relative z-10 grid min-h-[calc(100vh-64px)] place-items-center gap-12 max-[420px]:gap-[30px]"
        aria-label="Verify account"
      >
        <div
          className="font-heading text-[74px] leading-none font-extrabold tracking-[-0.06em] text-[#facc15] max-[420px]:text-[62px]"
          aria-hidden="true"
        >
          M
        </div>

        <form
          className="flex w-full max-w-[320px] flex-col gap-6 rounded-lg bg-[#27272a] p-6 text-[#e4e4e7] shadow-[0_18px_32px_rgba(0,0,0,0.24)] max-[420px]:gap-5 max-[420px]:p-5"
          onSubmit={async (event) => {
            event.preventDefault();
            setErrorMessage("");
            setSuccessMessage("");
            setIsSubmitting(true);

            try {
              await verifyUser({
                email: email.trim(),
                otpCode: otpCode.trim(),
              });
              setSuccessMessage("Account verified. You can now log in.");
              navigate("/login");
            } catch (error) {
              setErrorMessage(
                error instanceof Error
                  ? error.message
                  : "Unable to verify account"
              );
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <header>
            <h1 className="m-0 text-xl leading-tight font-semibold">
              Verify account
            </h1>
            <p className="mt-3 text-base leading-6 text-[#d4d4d8]">
              Enter your email and the 6-digit code sent to your inbox
            </p>
          </header>

          <label className="flex flex-col gap-1">
            <span className="text-sm leading-5 font-medium text-[#fafafa]">
              E-Mail
            </span>
            <span className="flex min-h-9 items-center gap-2 rounded-lg border border-[#3f3f46] bg-[rgba(255,255,255,0.05)] px-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <span
                className="grid h-5 w-5 flex-none place-items-center text-[#a1a1aa]"
                aria-hidden="true"
              >
                <Mail size={16} />
              </span>
              <input
                className="w-full border-0 bg-transparent text-sm leading-5 text-[#e4e4e7] outline-none placeholder:text-[#a1a1aa]"
                type="email"
                placeholder="youremail@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-sm leading-5 font-medium text-[#fafafa]">
              Verification code
            </span>
            <span className="flex min-h-9 items-center gap-2 rounded-lg border border-[#3f3f46] bg-[rgba(255,255,255,0.05)] px-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <span
                className="grid h-5 w-5 flex-none place-items-center text-[#a1a1aa]"
                aria-hidden="true"
              >
                <KeyRound size={16} />
              </span>
              <input
                className="w-full border-0 bg-transparent text-sm leading-5 text-[#e4e4e7] outline-none placeholder:text-[#a1a1aa]"
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="123456"
                value={otpCode}
                onChange={(event) =>
                  setOtpCode(event.target.value.replace(/\D/g, ""))
                }
                required
              />
            </span>
          </label>

          <div className="flex flex-col gap-4 pt-2">
            {errorMessage ? (
              <p className="rounded-md border border-[#ef4444]/45 bg-[#450a0a] px-3 py-2 text-sm leading-5 text-[#fecaca]">
                {errorMessage}
              </p>
            ) : null}
            {successMessage ? (
              <p className="rounded-md border border-[#22c55e]/45 bg-[#052e16] px-3 py-2 text-sm leading-5 text-[#bbf7d0]">
                {successMessage}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="min-h-9 w-full cursor-pointer rounded-lg border border-transparent bg-[#facc15] px-3 py-2 text-sm leading-5 font-medium text-[#09090b] transition-[transform,filter,opacity] duration-120 hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#facc1566]"
            >
              {isSubmitting ? "Verifying..." : "Verify account"}
            </button>

            <button
              type="button"
              disabled={isResending}
              className="min-h-9 w-full cursor-pointer rounded-lg border border-[#3f3f46] bg-[rgba(255,255,255,0.05)] px-3 py-2 text-sm leading-5 font-medium text-[#fafafa] transition-[transform,filter,opacity] duration-120 hover:-translate-y-px hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-65 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#facc1566]"
              onClick={async () => {
                setErrorMessage("");
                setSuccessMessage("");
                setIsResending(true);

                try {
                  await resendVerificationCode({ email: email.trim() });
                  setSuccessMessage(
                    "Verification code resent. Check your email."
                  );
                } catch (error) {
                  setErrorMessage(
                    error instanceof Error
                      ? error.message
                      : "Unable to resend code"
                  );
                } finally {
                  setIsResending(false);
                }
              }}
            >
              {isResending ? "Resending..." : "Resend code"}
            </button>

            <button
              type="button"
              className="min-h-9 w-full cursor-pointer rounded-lg border border-[#3f3f46] bg-transparent px-3 py-2 text-sm leading-5 font-medium text-[#d4d4d8] transition-[transform,filter] duration-120 hover:-translate-y-px hover:brightness-105 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#facc1566]"
              onClick={() => navigate("/login")}
            >
              Back to login
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
