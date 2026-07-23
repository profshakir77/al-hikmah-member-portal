import { useState } from "react";
import { Lock, Eye, EyeOff, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ResetPassword() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") ?? "";

  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) { setError("Invalid reset link — token is missing."); return; }
    if (newPassword.length < 4) { setError("Password must be at least 4 characters."); return; }
    if (newPassword !== confirm) { setError("Passwords do not match."); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reset failed");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-4"
      style={{ background: "linear-gradient(160deg, hsl(222 47% 10%) 0%, hsl(225 50% 6%) 60%, hsl(160 40% 8%) 100%)" }}
    >
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-5 w-full flex justify-center mb-4 shadow-xl">
            <img
              src="/logo-transparent.png"
              alt="Al-Hikmah Member Management Portal"
              className="h-20 w-auto object-contain"
            />
          </div>
          <p className="text-slate-400 text-sm">Reset your password</p>
        </div>

        <div
          className="rounded-2xl border border-white/10 p-6 shadow-2xl"
          style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(12px)" }}
        >
          {done ? (
            <div className="text-center space-y-4 py-2">
              <CheckCircle className="w-12 h-12 text-green-400 mx-auto" />
              <h2 className="text-white font-semibold text-lg">Password Reset!</h2>
              <p className="text-slate-400 text-sm">Your password has been updated successfully.</p>
              <a href="/">
                <Button className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold mt-2">
                  Go to Login
                </Button>
              </a>
            </div>
          ) : (
            <>
              <h2 className="text-white font-semibold text-lg mb-4">Set New Password</h2>
              {!token && (
                <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-red-300 text-sm mb-4">
                  Invalid reset link. Please request a new one from the login page.
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type={showPw ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 4 characters"
                      className="pl-9 pr-10 bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-green-500/60"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Confirm Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="Repeat new password"
                      className="pl-9 bg-white/5 border-white/15 text-white placeholder:text-slate-500 focus:border-green-500/60"
                    />
                  </div>
                </div>

                {error && (
                  <div className="rounded-lg bg-red-500/15 border border-red-500/30 px-3 py-2 text-red-300 text-sm">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading || !token}
                  className="w-full bg-green-600 hover:bg-green-500 text-white font-semibold py-2.5"
                >
                  {loading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
