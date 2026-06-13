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

  if (statsLoading || unpaidLoading) return <div className="p-8 text-muted-foreground">Loading dashboard...</div>;
  if (!stats) return <div className="p-8 text-muted-foreground">Error loading dashboard</div>;

  const statCards = [
    { label: "Total Members", value: stats.totalMembers, sub: `${stats.activeMembers} active`, icon: Users, color: "" },
    { label: "Paid This Month", value: stats.paidThisMonth, sub: "", icon: CreditCard, color: "text-green-600" },
    { label: "Unpaid This Month", value: stats.unpaidThisMonth, sub: "", icon: AlertCircle, color: "text-destructive" },
    { label: "Collected This Month", value: formatCurrency(stats.totalCollectedThisMonth), sub: `${formatCurrency(stats.totalCollectedThisYear)} YTD`, icon: TrendingUp, color: "" },
    { label: "Expenses This Month", value: formatCurrency(stats.totalExpensesThisMonth), sub: "", icon: Receipt, color: "text-orange-600" },
    { label: "Net This Month", value: formatCurrency(stats.netThisMonth), sub: "", icon: Scale, color: stats.netThisMonth >= 0 ? "text-green-600" : "text-destructive" },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview for {monthLabel(month)} {year}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{s.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                {s.sub && <p className="text-xs text-muted-foreground mt-1">{s.sub}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unpaid Members — {monthLabel(month)} {year}</CardTitle>
        </CardHeader>
        <CardContent>
          {!unpaidMembers?.length ? (
            <div className="text-center py-8 text-muted-foreground text-sm">All members have paid for this month.</div>
          ) : (
            <div className="space-y-3">
              {unpaidMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-sm text-muted-foreground">{member.registrationNumber} · {member.phone}</div>
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
