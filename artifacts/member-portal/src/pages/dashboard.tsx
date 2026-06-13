import { useGetDashboardStats, useGetUnpaidMembers, useGetSettings } from "@workspace/api-client-react";
import { useCurrentDate, formatCurrency, monthLabel } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, AlertCircle, TrendingUp, Receipt, Scale } from "lucide-react";
import { WhatsAppButton } from "@/components/whatsapp-button";

export default function Dashboard() {
  const { month, year } = useCurrentDate();
  const { data: settings } = useGetSettings();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({ month, year });
  const { data: unpaidMembers, isLoading: unpaidLoading } = useGetUnpaidMembers({ month, year });

  if (statsLoading || unpaidLoading) {
    return (
      <div className="p-8">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl bg-muted/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  if (!stats) return <div className="p-8 text-muted-foreground">Error loading dashboard</div>;

  const statCards = [
    {
      label: "Total Members", value: stats.totalMembers, sub: `${stats.activeMembers} active`,
      icon: Users, color: "text-blue-600", bg: "bg-blue-50", iconColor: "text-blue-500",
    },
    {
      label: "Paid This Month", value: stats.paidThisMonth, sub: "",
      icon: CreditCard, color: "text-green-600", bg: "bg-green-50", iconColor: "text-green-500",
    },
    {
      label: "Unpaid This Month", value: stats.unpaidThisMonth, sub: "",
      icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", iconColor: "text-red-500",
    },
    {
      label: "Collected This Month", value: formatCurrency(stats.totalCollectedThisMonth),
      sub: `${formatCurrency(stats.totalCollectedThisYear)} YTD`,
      icon: TrendingUp, color: "text-slate-800", bg: "bg-slate-50", iconColor: "text-slate-500",
    },
    {
      label: "Expenses This Month", value: formatCurrency(stats.totalExpensesThisMonth), sub: "",
      icon: Receipt, color: "text-orange-600", bg: "bg-orange-50", iconColor: "text-orange-500",
    },
    {
      label: "Net This Month",
      value: formatCurrency(stats.netThisMonth),
      sub: stats.netThisMonth >= 0 ? "Surplus" : "Deficit",
      icon: Scale,
      color: stats.netThisMonth >= 0 ? "text-green-600" : "text-red-600",
      bg: stats.netThisMonth >= 0 ? "bg-green-50" : "bg-red-50",
      iconColor: stats.netThisMonth >= 0 ? "text-green-500" : "text-red-500",
    },
  ];

  return (
    <div className="p-8 space-y-8 page-enter">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview for {monthLabel(month)} {year}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="stat-card border hover:border-primary/20 cursor-default overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${s.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                {s.sub && <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-500 pulse-dot" />
            Unpaid Members — {monthLabel(month)} {year}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!unpaidMembers?.length ? (
            <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-green-500" />
              </div>
              All members have paid for this month.
            </div>
          ) : (
            <div className="space-y-2">
              {unpaidMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-3.5 border rounded-xl hover:bg-red-50/50 hover:border-red-200 transition-all duration-150 group"
                >
                  <div>
                    <div className="font-semibold text-sm">{member.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {member.registrationNumber} · {member.phone}
                    </div>
                  </div>
                  <WhatsAppButton
                    phone={member.phone}
                    name={member.name}
                    month={month}
                    year={year}
                    amount={settings?.monthlyDueAmount}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
