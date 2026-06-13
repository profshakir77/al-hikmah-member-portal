import { useGetDashboardStats, useGetUnpaidMembers } from "@workspace/api-client-react";
import { useCurrentDate, formatCurrency, MONTHS } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, AlertCircle, DollarSign } from "lucide-react";
import { WhatsAppButton } from "@/components/whatsapp-button";

export default function Dashboard() {
  const { month, year } = useCurrentDate();
  
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({ month, year });
  const { data: unpaidMembers, isLoading: unpaidLoading } = useGetUnpaidMembers({ month, year });

  if (statsLoading || unpaidLoading) return <div className="p-8">Loading dashboard...</div>;
  if (!stats || !unpaidMembers) return <div className="p-8">Error loading dashboard</div>;

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview for {MONTHS.find(m => m.value === month)?.label} {year}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Members</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <p className="text-xs text-muted-foreground">{stats.activeMembers} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid This Month</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paidThisMonth}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unpaid This Month</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.unpaidThisMonth}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Collected This Month</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stats.totalCollectedThisMonth)}</div>
            <p className="text-xs text-muted-foreground">{formatCurrency(stats.totalCollectedThisYear)} YTD</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Unpaid Members ({MONTHS.find(m => m.value === month)?.label})</CardTitle>
        </CardHeader>
        <CardContent>
          {unpaidMembers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">All members have paid for this month.</div>
          ) : (
            <div className="space-y-4">
              {unpaidMembers.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <div className="font-medium">{member.name}</div>
                    <div className="text-sm text-muted-foreground">{member.registrationNumber} • {member.phone}</div>
                  </div>
                  <WhatsAppButton 
                    phone={member.phone} 
                    name={member.name} 
                    month={month} 
                    year={year} 
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