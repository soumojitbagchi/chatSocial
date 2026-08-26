import * as React from "react";
import { useState, useId } from "react";
import { Eye, EyeOff } from "lucide-react";
import { ChatSocialLogo } from "@/components/ui/logo";
import { Loader } from "@/components/ui/loader";
import signUpImage from "@/assets/auth-signup.jpg";

export interface SignUpProps {
  onLoginSuccess?: () => void;
  onSwitchToSignIn?: () => void;
}

export function SignUp({ onLoginSuccess, onSwitchToSignIn }: SignUpProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const nameId = useId();
  const emailId = useId();
  const passwordId = useId();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log("Sign Up submitted for chatSocial:", { name, email });
    setIsLoading(true);
    setTimeout(() => {
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    }, 600);
  };

  const handleGoogleLogin = () => {
    console.log("Google login clicked");
    setIsLoading(true);
    setTimeout(() => {
      if (onLoginSuccess) {
        onLoginSuccess();
      }
    }, 600);
  };

  return (
    <div className="w-full min-h-screen md:grid md:grid-cols-2 bg-background text-foreground selection:bg-emerald-500/30 selection:text-emerald-200 relative">
      {isLoading && <Loader fullscreen text="Creating your chatSocial account..." />}
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
      `}</style>

      {/* Left Form Canvas */}
      <div className="flex min-h-screen items-center justify-center p-6 md:p-12 relative z-10">
        <div className="mx-auto grid w-full max-w-[380px] gap-6">
          {/* Logo Header */}
          <div className="flex justify-center mb-1">
            <ChatSocialLogo size={28} />
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
                  className="flex h-11 w-full rounded-lg border border-input dark:border-input/50 bg-background pl-5 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm shadow-black/5 transition-all focus-visible:bg-accent/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                  className="flex h-11 w-full rounded-lg border border-input dark:border-input/50 bg-background pl-5 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm shadow-black/5 transition-all focus-visible:bg-accent/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                    className="flex h-11 w-full rounded-lg border border-input dark:border-input/50 bg-background pl-5 pr-12 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/70 shadow-sm shadow-black/5 transition-all focus-visible:bg-accent/30 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="mt-2 w-full inline-flex items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-2.5 h-11 shadow-md shadow-emerald-900/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-pointer"
              >
                Sign Up
              </button>
            </div>
          </form>

          {/* Toggle Switch */}
          <div className="text-center text-sm">
            <span className="text-muted-foreground">Already have an account?</span>{" "}
            <button
              type="button"
              className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline transition-colors cursor-pointer bg-transparent border-0 p-0"
              onClick={onSwitchToSignIn}
            >
              Sign in
            </button>
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

      {/* Right Hero / Image Banner */}
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
