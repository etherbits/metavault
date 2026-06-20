import { Eye, EyeOff, KeyRound, Lock, Mail } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  useConfirmPasswordReset,
  useRequestPasswordReset,
} from "@/features/auth/hooks";

type ResetStep = "email" | "code" | "password" | "complete";

interface PasswordResetFlowProps {
  initialEmail?: string;
  lockEmail?: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
  cancelLabel?: string;
}

export function PasswordResetFlow({
  initialEmail = "",
  lockEmail = false,
  onComplete,
  onCancel,
  cancelLabel = "Cancel",
}: PasswordResetFlowProps) {
  const [step, setStep] = useState<ResetStep>("email");
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const requestResetMutation = useRequestPasswordReset();
  const confirmResetMutation = useConfirmPasswordReset();
  const pending =
    requestResetMutation.isPending || confirmResetMutation.isPending;

  async function handleSendCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await requestResetMutation.mutateAsync({ email: email.trim() });
      setSuccessMessage("Password reset code sent. Check your email.");
      setStep("code");
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Unable to send password reset code"
      );
    }
  }

  function handleCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");
    setStep("password");
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    try {
      await confirmResetMutation.mutateAsync({
        email: email.trim(),
        otpCode: otpCode.trim(),
        password,
        confirmPassword,
      });
      setPassword("");
      setConfirmPassword("");
      setSuccessMessage("Password updated.");
      setStep("complete");
      onComplete?.();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update password"
      );
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <StepIndicator step={step} />

      {step === "email" ? (
        <form className="flex flex-col gap-4" onSubmit={handleSendCode}>
          <label className="flex flex-col gap-1">
            <span className="text-sm leading-5 font-medium text-[#FAFAFA]">
              Email
            </span>
            <span className="flex h-9 min-h-9 items-center gap-2 rounded-lg border border-[#3F3F46] bg-[rgba(255,255,255,0.05)] px-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <span
                className="grid h-5 w-5 flex-none place-items-center text-[#A1A1AA]"
                aria-hidden="true"
              >
                <Mail size={16} />
              </span>
              <input
                className="w-full border-0 bg-transparent text-sm leading-5 text-[#E4E4E7] outline-none placeholder:text-[#A1A1AA] disabled:opacity-70"
                type="email"
                name="reset-email"
                placeholder="you@example.com"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={lockEmail || pending}
                required
              />
            </span>
          </label>

          <FlowMessages error={errorMessage} success={successMessage} />

          <Button
            type="submit"
            variant="brand"
            disabled={!email.trim() || pending}
            className="min-h-9 w-full"
          >
            {requestResetMutation.isPending ? "Sending code..." : "Send code"}
          </Button>
        </form>
      ) : null}

      {step === "code" ? (
        <form className="flex flex-col gap-4" onSubmit={handleCodeSubmit}>
          <div>
            <p className="text-sm leading-5 text-[#D4D4D4]">
              We sent a 6-digit code to {email}.
            </p>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-sm leading-5 font-medium text-[#FAFAFA]">
              Reset code
            </span>
            <span className="flex h-9 min-h-9 items-center gap-2 rounded-lg border border-[#3F3F46] bg-[rgba(255,255,255,0.05)] px-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
              <span
                className="grid h-5 w-5 flex-none place-items-center text-[#A1A1AA]"
                aria-hidden="true"
              >
                <KeyRound size={16} />
              </span>
              <input
                className="w-full border-0 bg-transparent text-sm leading-5 text-[#E4E4E7] outline-none placeholder:text-[#A1A1AA]"
                type="text"
                inputMode="numeric"
                name="reset-code"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="000000"
                value={otpCode}
                onChange={(event) =>
                  setOtpCode(event.target.value.replace(/\D/g, ""))
                }
                required
              />
            </span>
          </label>

          <FlowMessages error={errorMessage} success={successMessage} />

          <div className="flex flex-col gap-3">
            <Button
              type="submit"
              variant="brand"
              disabled={otpCode.trim().length !== 6}
              className="min-h-9 w-full"
            >
              Continue
            </Button>
            <Button
              type="button"
              variant="surface"
              disabled={pending}
              className="min-h-9 w-full"
              onClick={() => {
                setErrorMessage("");
                setSuccessMessage("");
                setStep("email");
              }}
            >
              Change email
            </Button>
          </div>
        </form>
      ) : null}

      {step === "password" ? (
        <form className="flex flex-col gap-4" onSubmit={handlePasswordSubmit}>
          <label className="flex flex-col gap-1" htmlFor="reset-password">
            <span className="text-sm leading-5 font-medium text-[#FAFAFA]">
              New password
            </span>
            <PasswordInput
              id="reset-password"
              name="reset-password"
              value={password}
              showPassword={showPassword}
              placeholder="********"
              onChange={setPassword}
              onTogglePassword={() => setShowPassword((value) => !value)}
            />
          </label>

          <label
            className="flex flex-col gap-1"
            htmlFor="reset-confirm-password"
          >
            <span className="text-sm leading-5 font-medium text-[#FAFAFA]">
              Confirm password
            </span>
            <PasswordInput
              id="reset-confirm-password"
              name="reset-confirm-password"
              value={confirmPassword}
              showPassword={showPassword}
              placeholder="********"
              onChange={setConfirmPassword}
            />
          </label>

          <FlowMessages error={errorMessage} success={successMessage} />

          <Button
            type="submit"
            variant="brand"
            disabled={!password || !confirmPassword || pending}
            className="min-h-9 w-full"
          >
            {confirmResetMutation.isPending
              ? "Updating password..."
              : "Update password"}
          </Button>
        </form>
      ) : null}

      {step === "complete" ? (
        <div className="flex flex-col gap-4">
          <FlowMessages error={errorMessage} success={successMessage} />
          {onCancel ? (
            <Button
              type="button"
              variant="surface"
              className="min-h-9 w-full"
              onClick={onCancel}
            >
              {cancelLabel}
            </Button>
          ) : null}
        </div>
      ) : null}

      {onCancel && step !== "complete" ? (
        <Button
          type="button"
          variant="surface"
          disabled={pending}
          className="min-h-9 w-full"
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
      ) : null}
    </div>
  );
}

function StepIndicator({ step }: { step: ResetStep }) {
  const activeIndex =
    step === "email" ? 0 : step === "code" ? 1 : step === "password" ? 2 : 3;

  return (
    <div className="grid grid-cols-3 gap-2" aria-hidden="true">
      {["Email", "Code", "Password"].map((label, index) => (
        <div key={label} className="flex flex-col gap-1">
          <div
            className={
              index <= activeIndex
                ? "h-1 rounded-full bg-[#FACC16]"
                : "h-1 rounded-full bg-[#3F3F46]"
            }
          />
          <span className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#A1A1AA]">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}

function PasswordInput({
  name,
  id,
  value,
  showPassword,
  placeholder,
  onChange,
  onTogglePassword,
}: {
  name: string;
  id: string;
  value: string;
  showPassword: boolean;
  placeholder: string;
  onChange: (value: string) => void;
  onTogglePassword?: () => void;
}) {
  return (
    <span className="flex h-9 min-h-9 items-center gap-2 rounded-lg border border-[#3F3F46] bg-[rgba(255,255,255,0.05)] px-3 shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
      <span
        className="grid h-5 w-5 flex-none place-items-center text-[#A1A1AA]"
        aria-hidden="true"
      >
        <Lock size={16} />
      </span>
      <input
        id={id}
        className="w-full border-0 bg-transparent text-sm leading-5 text-[#E4E4E7] outline-none placeholder:text-[#A1A1AA]"
        type={showPassword ? "text" : "password"}
        name={name}
        placeholder={placeholder}
        autoComplete="new-password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required
      />
      {onTogglePassword ? (
        <button
          type="button"
          className="grid h-5 w-5 place-items-center bg-transparent p-0 text-[#A1A1AA] transition-colors hover:text-[#E4E4E7] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#facc1566]"
          aria-label={showPassword ? "Hide password" : "Show password"}
          onClick={onTogglePassword}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      ) : null}
    </span>
  );
}

function FlowMessages({ error, success }: { error: string; success: string }) {
  return (
    <>
      {error ? (
        <p className="rounded-md border border-[#EF4444]/45 bg-[#450A0A] px-3 py-2 text-sm leading-5 text-[#FECACA]">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-[#22C55E]/45 bg-[#052E16] px-3 py-2 text-sm leading-5 text-[#BBF7D0]">
          {success}
        </p>
      ) : null}
    </>
  );
}
