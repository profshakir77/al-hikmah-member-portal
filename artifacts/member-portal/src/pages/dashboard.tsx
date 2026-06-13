import { useState, useEffect } from "react";
import {
  useGetDashboardStats,
  useGetUnpaidMembers,
  useGetSettings,
  useGetYearlyReport,
} from "@workspace/api-client-react";
import { useCurrentDate, formatCurrency, monthLabel, MONTHS } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, CreditCard, AlertCircle, TrendingUp, Receipt, Scale } from "lucide-react";
import { WhatsAppButton } from "@/components/whatsapp-button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip as PieTooltip,
} from "recharts";

// ── Live Clock ────────────────────────────────────────────────────────────────
function LiveClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hh = now.getHours().toString().padStart(2, "0");
  const mm = now.getMinutes().toString().padStart(2, "0");
  const ss = now.getSeconds().toString().padStart(2, "0");
  const dayName = now.toLocaleDateString("en-GB", { weekday: "long" });
  const dateStr = now.toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div
      className="rounded-2xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      style={{ background: "linear-gradient(135deg, hsl(222 47% 13%) 0%, hsl(225 50% 20%) 100%)" }}
    >
      {/* Time */}
      <div className="flex items-end gap-2">
        <span
          className="font-bold tabular-nums text-white leading-none"
          style={{ fontSize: "clamp(2.5rem, 8vw, 4.5rem)", letterSpacing: "-0.03em" }}
        >
          {hh}<span className="opacity-50 animate-pulse">:</span>{mm}
        </span>
        <div className="flex flex-col pb-1.5">
          <span
            className="font-mono tabular-nums text-blue-200 leading-none"
            style={{ fontSize: "clamp(1rem, 3vw, 1.75rem)" }}
          >
            :{ss}
          </span>
        </div>
      </div>

      {/* Date + greeting */}
      <div className="text-right sm:text-right">
        <div className="text-white font-bold text-lg md:text-xl leading-tight">{dayName}</div>
        <div className="text-blue-200 text-sm mt-0.5">{dateStr}</div>
        <div className="text-blue-300/60 text-xs mt-1.5">Al-Hikmah Community Center</div>
      </div>
    </div>
  );
}

// ── Custom tooltip for bar chart ─────────────────────────────────────────────
function BarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string; color: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
      <div className="font-semibold text-slate-700 mb-2">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: p.color }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-semibold">{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ── Custom tooltip for donut ─────────────────────────────────────────────────
function DonutTooltip({ active, payload }: { active?: boolean; payload?: { name: string; value: number }[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0]!;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-sm">
      <span className="font-semibold">{p.name}: </span>
      <span>{p.value} members</span>
    </div>
  );
}

// ── Custom donut label ───────────────────────────────────────────────────────
function DonutCenterLabel({ cx, cy, total, rate }: { cx: number; cy: number; total: number; rate: number }) {
  return (
    <g>
      <text x={cx} y={cy - 8} textAnchor="middle" fill="#1e293b" className="font-bold" style={{ fontSize: 22, fontWeight: 700 }}>
        {rate.toFixed(0)}%
      </text>
      <text x={cx} y={cy + 10} textAnchor="middle" fill="#94a3b8" style={{ fontSize: 11 }}>
        collected
      </text>
      <text x={cx} y={cy + 24} textAnchor="middle" fill="#94a3b8" style={{ fontSize: 10 }}>
        {total} members
      </text>
    </g>
  );
}

// ── Dashboard ────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { month, year } = useCurrentDate();
  const { data: settings } = useGetSettings();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats({ month, year });
  const { data: yearlyReport } = useGetYearlyReport({ year });
  const { data: unpaidMembers, isLoading: unpaidLoading } = useGetUnpaidMembers({ month, year });

  // Build last-6-months bar chart data
  const barData = (() => {
    if (!yearlyReport) return [];
    const result = [];
    for (let i = 5; i >= 0; i--) {
      let m = month - i;
      let y = year;
      if (m <= 0) { m += 12; y -= 1; }
      const row = yearlyReport.monthlyBreakdown.find((r) => r.month === m);
      result.push({
        name: MONTHS.find((x) => x.value === m)?.label.slice(0, 3) ?? String(m),
        Income: row?.collected ?? 0,
        Expenses: row?.expenses ?? 0,
      });
    }
    return result;
  })();

  // Donut data
  const donutData = stats
    ? [
        { name: "Paid", value: stats.paidThisMonth },
        { name: "Unpaid", value: stats.unpaidThisMonth },
      ]
    : [];
  const collectionRate = stats && stats.paidThisMonth + stats.unpaidThisMonth > 0
    ? (stats.paidThisMonth / (stats.paidThisMonth + stats.unpaidThisMonth)) * 100
    : 0;

  if (statsLoading || unpaidLoading) {
    return (
      <div className="p-4 md:p-8 space-y-4">
        <div className="h-28 rounded-2xl bg-slate-800/20 animate-pulse" />
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-muted/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }
  if (!stats) return <div className="p-4 md:p-8 text-muted-foreground">Error loading dashboard</div>;

  const statCards = [
    { label: "Total Members", value: stats.totalMembers, sub: `${stats.activeMembers} active`, icon: Users, color: "text-blue-600", bg: "bg-blue-50", iconColor: "text-blue-500" },
    { label: "Paid This Month", value: stats.paidThisMonth, sub: "", icon: CreditCard, color: "text-green-600", bg: "bg-green-50", iconColor: "text-green-500" },
    { label: "Unpaid This Month", value: stats.unpaidThisMonth, sub: "", icon: AlertCircle, color: "text-red-600", bg: "bg-red-50", iconColor: "text-red-500" },
    { label: "Collected This Month", value: formatCurrency(stats.totalCollectedThisMonth), sub: `${formatCurrency(stats.totalCollectedThisYear)} YTD`, icon: TrendingUp, color: "text-slate-800", bg: "bg-slate-50", iconColor: "text-slate-500" },
    { label: "Expenses This Month", value: formatCurrency(stats.totalExpensesThisMonth), sub: "", icon: Receipt, color: "text-orange-600", bg: "bg-orange-50", iconColor: "text-orange-500" },
    { label: "Net This Month", value: formatCurrency(stats.netThisMonth), sub: stats.netThisMonth >= 0 ? "Surplus" : "Deficit", icon: Scale, color: stats.netThisMonth >= 0 ? "text-green-600" : "text-red-600", bg: stats.netThisMonth >= 0 ? "bg-green-50" : "bg-red-50", iconColor: stats.netThisMonth >= 0 ? "text-green-500" : "text-red-500" },
  ];

  return (
    <div className="p-4 md:p-6 space-y-5 page-enter">

      {/* ── Big clock ── */}
      <LiveClock />

      {/* ── Stat cards ── */}
      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-3">
        {statCards.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="stat-card border hover:border-primary/20 cursor-default overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 md:pb-2 pt-3 md:pt-4 px-3 md:px-5">
                <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">{s.label}</CardTitle>
                <div className={`w-7 h-7 md:w-9 md:h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                  <Icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${s.iconColor}`} />
                </div>
              </CardHeader>
              <CardContent className="px-3 md:px-5 pb-3 md:pb-4">
                <div className={`text-xl md:text-2xl font-bold ${s.color}`}>{s.value}</div>
                {s.sub && <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Charts row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* Bar chart — income vs expenses (last 6 months) */}
        <Card className="lg:col-span-2 hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg">Income vs Expenses — Last 6 Months</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            {barData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">Loading chart…</div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `€${v}`}
                    width={48}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: "#f8fafc", radius: 6 }} />
                  <Legend
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                  />
                  <Bar dataKey="Income" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Expenses" fill="#f97316" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Donut — paid vs unpaid this month */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base md:text-lg">Collection Status</CardTitle>
            <p className="text-xs text-muted-foreground -mt-1">{monthLabel(month)} {year}</p>
          </CardHeader>
          <CardContent className="flex flex-col items-center pt-0">
            {stats.paidThisMonth + stats.unpaidThisMonth === 0 ? (
              <div className="h-[180px] flex items-center justify-center text-muted-foreground text-sm">No members yet</div>
            ) : (
              <PieChart width={190} height={190}>
                <Pie
                  data={donutData}
                  cx={95}
                  cy={95}
                  innerRadius={58}
                  outerRadius={88}
                  paddingAngle={3}
                  dataKey="value"
                  startAngle={90}
                  endAngle={-270}
                >
                  <Cell fill="#22c55e" stroke="transparent" />
                  <Cell fill="#f87171" stroke="transparent" />
                  <DonutCenterLabel cx={95} cy={95} total={stats.paidThisMonth + stats.unpaidThisMonth} rate={collectionRate} />
                </Pie>
                <PieTooltip content={<DonutTooltip />} />
              </PieChart>
            )}
            <div className="flex items-center gap-4 mt-1 text-sm">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-green-500 shrink-0" />
                <span className="text-muted-foreground">Paid <strong className="text-foreground">{stats.paidThisMonth}</strong></span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-red-400 shrink-0" />
                <span className="text-muted-foreground">Unpaid <strong className="text-foreground">{stats.unpaidThisMonth}</strong></span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Unpaid members ── */}
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <span className="w-2 h-2 rounded-full bg-red-500 pulse-dot" />
            Unpaid Members - {monthLabel(month)} {year}
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
                  className="flex items-center justify-between p-3 border rounded-xl hover:bg-red-50/50 hover:border-red-200 transition-all duration-150 gap-2"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-sm truncate">{member.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5 truncate">
                      {member.registrationNumber} · {member.phone}
                    </div>
                  </div>
                  <div className="shrink-0">
                    <WhatsAppButton
                      phone={member.phone}
                      name={member.name}
                      month={month}
                      year={year}
                      amount={settings?.monthlyDueAmount}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
