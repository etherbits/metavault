import { useNavigate } from "react-router";
import { MetaIcon } from "@/components/MetaIcon";
import { PasswordResetFlow } from "@/components/PasswordResetFlow";

export function ForgotPasswordPage() {
  const navigate = useNavigate();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#18181B] px-4 py-8">
      <section
        className="relative z-10 mx-auto flex min-h-[calc(100vh-64px)] w-full max-w-[320px] flex-col items-center justify-center gap-12"
        aria-label="Reset password"
      >
        <div
          className="flex h-[42px] w-12 items-center justify-center"
          aria-hidden="true"
        >
          <MetaIcon className="h-[42px] w-12" />
        </div>

        <div className="flex w-full max-w-[320px] flex-col gap-6 rounded-lg bg-[#27272A] p-6 text-[#E4E4E7] shadow-[0_18px_32px_rgba(0,0,0,0.24)] max-[420px]:gap-5 max-[420px]:p-5">
          <header>
            <h1 className="m-0 text-[20px] leading-6 font-semibold">
              Reset password
            </h1>
            <p className="mt-3 text-base leading-6 text-[#D4D4D8]">
              Reset your password in three quick steps.
            </p>
          </header>

          <PasswordResetFlow
            cancelLabel="Back to login"
            onCancel={() => navigate("/login")}
          />
        </div>
      </section>
    </main>
  );
}
