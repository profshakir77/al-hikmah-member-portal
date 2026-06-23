import { useState, type FormEvent } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, EyeOff, Lock, User, Phone, Mail, HelpCircle } from "lucide-react";

export default function Login() {
  const { login, isLoading } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);

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

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{
        background: "linear-gradient(160deg, hsl(222 47% 10%) 0%, hsl(225 50% 6%) 60%, hsl(160 40% 8%) 100%)",
      }}
    >
      {/* Card */}
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
      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Password resets are handled by the system administrator. Please contact:
            </p>
            <div className="rounded-lg bg-muted p-4 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                  <User className="w-4 h-4 text-green-700" />
                </div>
                <div>
                  <p className="font-semibold text-sm">Shakir Hussain</p>
                  <p className="text-xs text-muted-foreground">System Developer</p>
                </div>
              </div>
              <a
                href="tel:+923316303327"
                className="flex items-center gap-2 text-sm text-green-700 hover:underline"
              >
                <Phone className="w-4 h-4" /> +92-331-6303327
              </a>
              <a
                href="mailto:prof.shakir77@gmail.com"
                className="flex items-center gap-2 text-sm text-green-700 hover:underline"
              >
                <Mail className="w-4 h-4" /> prof.shakir77@gmail.com
              </a>
            </div>
            <p className="text-xs text-muted-foreground">
              The admin can reset your password from the Users management section.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
