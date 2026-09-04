import * as React from "react";
import { useState, useId } from "react";
import { useNavigate, Link } from "react-router";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { ChatSocialLogo } from "@/components/ui/logo";
import { Loader } from "@/components/ui/loader";
import { useAuthContext } from "../hooks/useAuthContext";
import signInImage from "@/assets/auth-signin.jpg";
import { CredentialResponse, GoogleLogin } from "@react-oauth/google";

export interface SignInProps {
  onLoginSuccess?: () => void;
  onSwitchToSignUp?: () => void;
  onBackToHome?: () => void;
}

export function SignIn({ onLoginSuccess, onSwitchToSignUp, onBackToHome }: SignInProps) {
  const navigate = useNavigate();
  const { login, googleLogin } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [needsVerification, setNeedsVerification] = useState(false);
  const [infoMessage, setInfoMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const identifierId = useId();
  const passwordId = useId();

  const handleSuccessRedirect = () => {
    if (onLoginSuccess) {
      onLoginSuccess();
    } else {
      navigate("/chat", { replace: true });
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage("");
    setInfoMessage("");
    setNeedsVerification(false);
    setIsLoading(true);

    try {
      await login({ identifier: identifier.trim(), password });
      setIsLoading(false);
      handleSuccessRedirect();
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : "Invalid credentials";
      setErrorMessage(msg);
      // Manual accounts must verify email first; Google accounts never hit this.
      if (/verify your email/i.test(msg)) {
        setNeedsVerification(true);
      }
    }
  };

  const handleResendCode = async () => {
    setInfoMessage("");
    try {
      const { authService } = await import("../api/authService");
      await authService.sendVerificationEmail(identifier.includes("@") ? identifier.trim() : undefined);
      setInfoMessage("Verification code resent. Please check your inbox.");
    } catch {
      setInfoMessage("Could not resend code. Please try again.");
    }
  };

  const handleGoogleLogin = async (response: CredentialResponse) => {
    if (!response.credential) {
      setErrorMessage("Google did not return a valid credential.");
      return;
    }

    setErrorMessage("");
    setIsLoading(true);
    try {
      await googleLogin(response.credential);
      handleSuccessRedirect();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to sign in with Google.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen md:grid md:grid-cols-2 bg-background text-foreground selection:bg-[#f2552c]/30 selection:text-[#f2552c] relative">
      {isLoading && <Loader fullscreen text="Connecting to chatSocial..." />}
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
      `}</style>
      <div className="flex min-h-screen items-center justify-center p-6 md:p-12 relative z-10">
        <div className="mx-auto grid w-full max-w-[380px] gap-6">
          <div className="flex items-center justify-between mb-1">
            {onBackToHome ? (
              <button
                type="button"
                onClick={onBackToHome}
                className="text-xs font-mono text-muted-foreground hover:text-[#f2552c] transition-colors cursor-pointer"
              >
                &larr; Home
              </button>
            ) : (
              <Link
                to="/"
                className="text-xs font-mono text-muted-foreground hover:text-[#f2552c] transition-colors cursor-pointer"
              >
                &larr; Home
              </Link>
            )}
            <Link to="/">
              <ChatSocialLogo size={26} />
            </Link>
            <span className="w-8" />
          </div>

          <form onSubmit={handleSubmit} autoComplete="on" className="flex flex-col gap-5">
            <div className="flex flex-col items-center gap-1.5 text-center">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">
                Sign in to chatSocial
              </h1>
              <p className="text-balance text-sm text-muted-foreground">
                Enter your credentials below to access your chats
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <AlertCircle size={15} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                {needsVerification && (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="self-start font-semibold text-[#f2552c] hover:underline cursor-pointer bg-transparent border-0 p-0"
                  >
                    Resend verification code
                  </button>
                )}
              </div>
            )}

            {infoMessage && (
              <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-600 dark:text-emerald-400 text-xs">
                <span>{infoMessage}</span>
              </div>
            )}

            <div className="grid gap-3.5">
              <div className="grid gap-1.5 text-left">
                <label htmlFor={identifierId} className="text-sm font-medium text-foreground/90">
                  Email or Username
                </label>
                <input
                  id={identifierId}
                  name="identifier"
                  type="text"
                  required
                  autoComplete="username"
                  placeholder="user@chatsocial.com or username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-5 pr-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 shadow-sm shadow-black/5 transition-all focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2552c] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="grid gap-1.5 text-left">
                <label htmlFor={passwordId} className="text-sm font-medium text-foreground/90">
                  Password
                </label>
                <div className="relative">
                  <input
                    id={passwordId}
                    name="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="flex h-11 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-5 pr-12 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 shadow-sm shadow-black/5 transition-all focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2552c] disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex h-full w-11 items-center justify-center text-muted-foreground/80 hover:text-foreground transition-colors focus-visible:outline-none cursor-pointer"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="mt-2 w-full inline-flex items-center justify-center rounded-lg bg-[#f2552c] hover:bg-[#d9441e] text-white font-semibold py-2.5 h-11 shadow-md shadow-[#f2552c]/20 transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2552c] cursor-pointer"
              >
                Sign In
              </button>
            </div>
          </form>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Don't have an account?</span>{" "}
            {onSwitchToSignUp ? (
              <button
                type="button"
                className="font-semibold text-[#f2552c] hover:text-[#d9441e] hover:underline transition-colors cursor-pointer bg-transparent border-0 p-0"
                onClick={onSwitchToSignUp}
              >
                Sign up
              </button>
            ) : (
              <Link
                to="/signup"
                className="font-semibold text-[#f2552c] hover:text-[#d9441e] hover:underline transition-colors cursor-pointer bg-transparent border-0 p-0"
              >
                Sign up
              </Link>
            )}
          </div>

          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>

          <div className="flex min-h-11 w-full items-center justify-center overflow-hidden rounded-lg">
            <GoogleLogin
              onSuccess={handleGoogleLogin}
              onError={() => setErrorMessage("Google sign-in was cancelled or could not be completed.")}
              theme="outline"
              size="large"
              shape="rectangular"
              text="signin_with"
              width="332"
            />
          </div>
        </div>
      </div>
      <div className="hidden md:block relative w-full h-full min-h-screen overflow-hidden bg-muted/20">
        <img
          src={signInImage}
          alt="chatSocial Sign In"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-black/20" />
        <div className="absolute inset-x-0 bottom-0 h-[120px] bg-gradient-to-t from-background to-transparent" />
      </div>
    </div>
  );
}

export default SignIn;
