import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, EyeOff, Lock, User, Phone, Mail, HelpCircle, Copy, Check, ArrowLeft } from "lucide-react";

export default function Login() {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password state
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLink, setForgotLink] = useState("");
  const [forgotName, setForgotName] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!username.trim() || !password.trim()) {
      setError("Please enter your username and password.");
      return;
    }
    try {
      await login(username.trim(), password.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    }
  };

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    if (!forgotEmail.trim()) { setForgotError("Please enter your email address."); return; }
    setForgotLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Request failed");
      setForgotLink(data.resetLink);
      setForgotName(data.name ?? "");
      setForgotStep(2);
    } catch (err) {
      setForgotError(err instanceof Error ? err.message : "Request failed. Please try again.");
    } finally {
      setForgotLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(forgotLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select the text
    }
  };

  const closeForgot = () => {
    setForgotOpen(false);
    setTimeout(() => {
      setForgotStep(1);
      setForgotEmail("");
      setForgotLink("");
      setForgotName("");
      setForgotError(null);
      setCopied(false);
    }, 300);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        background: "linear-gradient(160deg, hsl(222 47% 10%) 0%, hsl(225 50% 6%) 60%, hsl(160 40% 8%) 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo area */}
        <div className="flex flex-col items-center mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5 w-full flex justify-center mb-4 shadow-xl">
            <img
              src="/logo-transparent.png"
              alt="Al-Hikmah Member Management Portal"
              className="h-20 w-auto object-contain"
            />
          </div>
          <p className="text-slate-400 text-sm">Sign in to continue</p>
        </div>

        {/* Login form */}
        <div
          className="rounded-2xl border border-white/10 p-6 shadow-2xl"
          style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)" }}
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Username</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  autoFocus
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="pl-9 bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-green-500/60 focus:ring-green-500/20"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="pl-9 pr-10 bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-green-500/60 focus:ring-green-500/20"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-red-300 text-sm">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5 transition-colors"
            >
              {isLoading ? "Signing in..." : "Sign In"}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => setForgotOpen(true)}
              className="text-sm text-slate-400 hover:text-green-400 transition-colors inline-flex items-center gap-1.5"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              Forgot password?
            </button>
          </div>
        </div>

        {/* Developer credits */}
        <div className="mt-8 text-center space-y-1">
          <p className="text-slate-500 text-xs">Developed by</p>
          <p className="text-slate-300 text-sm font-semibold">Shakir Hussain</p>
          <div className="flex items-center justify-center gap-4 mt-1">
            <a
              href="tel:+923316303327"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-green-400 transition-colors"
            >
              <Phone className="w-3 h-3" /> +92-331-6303327
            </a>
            <a
              href="mailto:prof.shakir77@gmail.com"
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-green-400 transition-colors"
            >
              <Mail className="w-3 h-3" /> prof.shakir77@gmail.com
            </a>
          </div>
        </div>
      </div>

      {/* Forgot Password Dialog */}
      <Dialog open={forgotOpen} onOpenChange={closeForgot}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {forgotStep === 2 && (
                <button onClick={() => setForgotStep(1)} className="text-muted-foreground hover:text-foreground">
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
              {forgotStep === 1 ? "Forgot Password" : "Reset Link Ready"}
            </DialogTitle>
          </DialogHeader>

          {forgotStep === 1 ? (
            <form onSubmit={handleForgotSubmit} className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Enter the email address linked to your account. A reset link will be generated for you.
              </p>
              <div className="space-y-1.5">
                <Label>Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="your@email.com"
                    className="pl-9"
                    autoFocus
                  />
                </div>
              </div>
              {forgotError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-600 text-sm">
                  {forgotError}
                </div>
              )}
              <Button type="submit" disabled={forgotLoading} className="w-full">
                {forgotLoading ? "Checking..." : "Get Reset Link"}
              </Button>
            </form>
          ) : (
            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                ✓ Reset link generated{forgotName ? ` for ${forgotName}` : ""}. Copy it and open it in your browser.
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Reset Link (valid for 1 hour)</Label>
                <div className="flex gap-2">
                  <input
                    readOnly
                    value={forgotLink}
                    className="flex-1 text-xs bg-muted border rounded-md px-3 py-2 font-mono overflow-hidden text-ellipsis"
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                  />
                  <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0 gap-1.5">
                    {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                Open the link in a browser to set your new password. The link expires in 1 hour.
              </p>

              <Button asChild className="w-full" variant="outline">
                <a href={forgotLink} target="_blank" rel="noopener noreferrer">
                  Open Reset Page →
                </a>
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
