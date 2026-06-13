import { Link, useLocation } from "wouter";
import { Users, LayoutDashboard, CreditCard, FileBarChart, Settings, Receipt, UserCog, Download } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/members", label: "Members", icon: Users },
    { href: "/payments", label: "Payments", icon: CreditCard },
    { href: "/expenses", label: "Expenses", icon: Receipt },
    { href: "/reports", label: "Reports", icon: FileBarChart },
    { href: "/users", label: "Users", icon: UserCog },
    { href: "/backup", label: "Backup", icon: Download },
    { href: "/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-60 shrink-0 border-r border-border bg-sidebar text-sidebar-foreground flex flex-col">
        <div className="flex h-14 items-center px-5 border-b border-border">
          <span className="font-bold text-base text-primary">MemberPortal</span>
        </div>
        <nav className="p-3 space-y-0.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto min-h-screen">
        {children}
      </main>
    </div>
  );
}
