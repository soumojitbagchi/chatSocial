import * as React from "react";
import { useState, useId } from "react";
import { useNavigate, Link } from "react-router";
import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { ChatSocialLogo } from "@/components/ui/logo";
import { Loader } from "@/components/ui/loader";
import { useAuthContext } from "../hooks/useAuthContext";
import signUpImage from "@/assets/auth-signup.jpg";

export interface SignUpProps {
  onLoginSuccess?: () => void;
  onSwitchToSignIn?: () => void;
  onBackToHome?: () => void;
}

export function SignUp({ onLoginSuccess, onSwitchToSignIn, onBackToHome }: SignUpProps) {
  const navigate = useNavigate();
  const { register } = useAuthContext();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const nameId = useId();
  const emailId = useId();
  const usernameId = useId();
  const passwordId = useId();
  const phoneId = useId();

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
    setIsLoading(true);

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        username: username.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
      });
      setIsLoading(false);
      handleSuccessRedirect();
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : "Failed to create account. Please try again.";
      setErrorMessage(msg);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMessage("");
    setIsLoading(true);
    try {
      await register({
        name: "Google User",
        email: "google.user@chatsocial.com",
        username: "google_user",
        password: "google_oauth_pass",
      });
      setIsLoading(false);
      handleSuccessRedirect();
    } catch (err: unknown) {
      setIsLoading(false);
      const msg = err instanceof Error ? err.message : "Failed to sign up with Google.";
      setErrorMessage(msg);
    }
  };

  return (
    <div className="w-full min-h-screen md:grid md:grid-cols-2 bg-background text-foreground selection:bg-[#f2552c]/30 selection:text-[#f2552c] relative">
      {isLoading && <Loader fullscreen text="Creating your chatSocial account..." />}
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
                Create a chatSocial Account
              </h1>
              <p className="text-balance text-sm text-muted-foreground">
                Join thousands connecting seamlessly in real-time
              </p>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="grid gap-3.5">
              <div className="grid gap-1.5 text-left">
                <label htmlFor={nameId} className="text-sm font-medium text-foreground/90">
                  Full Name
                </label>
                <input
                  id={nameId}
                  name="name"
                  type="text"
                  required
                  autoComplete="name"
                  placeholder="John Doe"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-5 pr-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 shadow-sm shadow-black/5 transition-all focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2552c] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="grid gap-1.5 text-left">
                <label htmlFor={emailId} className="text-sm font-medium text-foreground/90">
                  Email
                </label>
                <input
                  id={emailId}
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="user@chatsocial.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-5 pr-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 shadow-sm shadow-black/5 transition-all focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2552c] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
              <div className="grid gap-1.5 text-left">
                <label htmlFor={phoneId} className="text-sm font-medium text-foreground/90">
                  Phone Number <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  id={phoneId}
                  name="phone"
                  type="text"
                  required
                  autoComplete="phone"
                  placeholder="1234567890"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex h-11 w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 pl-5 pr-4 py-2.5 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 shadow-sm shadow-black/5 transition-all focus-visible:bg-slate-50 dark:focus-visible:bg-slate-800/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f2552c] disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>

              <div className="grid gap-1.5 text-left">
                <label htmlFor={usernameId} className="text-sm font-medium text-foreground/90">
                  Username <span className="text-xs text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  id={usernameId}
                  name="username"
                  type="text"
                  autoComplete="username"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
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
                    autoComplete="new-password"
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
                Sign Up
              </button>
            </div>
          </form>
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account?</span>{" "}
            {onSwitchToSignIn ? (
              <button
                type="button"
                className="font-semibold text-[#f2552c] hover:text-[#d9441e] hover:underline transition-colors cursor-pointer bg-transparent border-0 p-0"
                onClick={onSwitchToSignIn}
              >
                Sign in
              </button>
            ) : (
              <Link
                to="/signin"
                className="font-semibold text-[#f2552c] hover:text-[#d9441e] hover:underline transition-colors cursor-pointer bg-transparent border-0 p-0"
              >
                Sign in
              </Link>
            )}
          </div>

          <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
            <span className="relative z-10 bg-background px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-lg border border-border/80 bg-background hover:bg-accent/60 text-sm font-medium text-foreground transition-colors focus-visible:outline-none cursor-pointer"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google icon"
              className="h-4 w-4"
            />
            Continue with Google
          </button>
        </div>
      </div>
      <div className="hidden md:block relative w-full h-full min-h-screen overflow-hidden bg-muted/20">
        <img
          src={signUpImage}
          alt="chatSocial Sign Up"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-black/20" />
        <div className="absolute inset-x-0 bottom-0 h-[120px] bg-gradient-to-t from-background to-transparent" />
      </div>
    </div>
  );
}

export default SignUp;
