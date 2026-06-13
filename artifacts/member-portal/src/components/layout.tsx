import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  Users, LayoutDashboard, CreditCard, FileBarChart, Settings,
  Receipt, UserCog, Download, ChevronRight, Cloud, Menu, X, FileText,
} from "lucide-react";
import { getAutoBackups } from "@/hooks/use-auto-backup";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const snaps = getAutoBackups();
    if (snaps.length > 0) setLastSaved(snaps[0]!.savedAt);
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.savedAt) setLastSaved(detail.savedAt as string);
    };
    window.addEventListener("autobackup", handler);
    return () => window.removeEventListener("autobackup", handler);
  }, []);

  // Close sidebar on route change (mobile)
  useEffect(() => { setSidebarOpen(false); }, [location]);

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/members", label: "Members", icon: Users },
    { href: "/payments", label: "Payments", icon: CreditCard },
    { href: "/expenses", label: "Expenses", icon: Receipt },
    { href: "/reports", label: "Reports", icon: FileBarChart },
    { href: "/tax", label: "Tax Report", icon: FileText },
    { href: "/users", label: "Users", icon: UserCog },
    { href: "/backup", label: "Backup", icon: Download },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  const sidebarStyle = {
    background: "linear-gradient(175deg, hsl(222 47% 13%) 0%, hsl(225 50% 9%) 100%)",
    borderRight: "1px solid rgba(255,255,255,0.06)",
  };

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="px-5 pt-6 pb-5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
            <Users className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-sm text-white leading-none">MemberPortal</div>
            <div className="text-[10px] text-blue-300/70 mt-0.5">Al-Hikmah CC</div>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          className="md:hidden text-slate-400 hover:text-white transition-colors p-1"
          onClick={() => setSidebarOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Auto-save indicator */}
      {lastSaved && (
        <div className="mx-3 mb-3 px-3 py-1.5 rounded-md bg-green-500/10 border border-green-500/20 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 pulse-dot shrink-0" />
          <span className="text-[10px] text-green-300/80 truncate">
            Saved {new Date(lastSaved).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-0.5 pb-4 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                active
                  ? "bg-blue-500 text-white shadow-md shadow-blue-500/25 nav-active"
                  : "text-slate-400 hover:text-white hover:bg-white/8"
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 transition-transform duration-150 ${active ? "" : "group-hover:scale-110"}`} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="w-3 h-3 opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Cloud icon */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/4 border border-white/6">
          <Cloud className="w-3.5 h-3.5 text-blue-400/60" />
          <span className="text-[10px] text-slate-500">Auto-backup active</span>
        </div>
      </div>

      {/* Developer credit */}
      <div className="px-4 py-3 border-t border-white/6">
        <div className="text-[10px] text-slate-500 leading-relaxed space-y-0.5">
          <div className="text-slate-400 font-medium">Developed by</div>
          <div className="text-blue-300/80 font-semibold">Shakir Hussain</div>
          <div className="text-slate-500">+92-331-6303327</div>
          <a
            href="mailto:prof.shakir77@gmail.com"
            className="block text-slate-500 hover:text-blue-300 transition-colors truncate"
          >
            prof.shakir77@gmail.com
          </a>
        </div>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">

      {/* ── Desktop sidebar (hidden on mobile) ── */}
      <aside
        className="hidden md:flex w-60 shrink-0 flex-col"
        style={sidebarStyle}
      >
        <SidebarContent />
      </aside>

      {/* ── Mobile sidebar overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          {/* Drawer */}
          <aside
            className="relative z-10 w-64 flex flex-col h-full"
            style={sidebarStyle}
          >
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center gap-3 px-4 py-3 border-b bg-white/95 backdrop-blur sticky top-0 z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
              <Users className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-semibold text-sm text-slate-800">MemberPortal</span>
          </div>
        </header>

        <main className="flex-1 overflow-auto page-enter">
          {children}
        </main>
      </div>
    </div>
  );
}
