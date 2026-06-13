import { useState } from "react";
import { useGetMembersReport, useGetSettings } from "@workspace/api-client-react";
import { useCurrentDate, generateYearOptions, formatCurrency } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, CheckCircle, Download, Clock } from "lucide-react";
import { generateMembersReportPdf, printedAt } from "@/lib/pdf-report";

const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function NowBadge() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-full px-3 py-1 shrink-0">
      <Clock className="w-3 h-3 text-blue-500" />
      <span className="hidden sm:inline">{printedAt()}</span>
      <span className="sm:hidden">{new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
    </div>
  );
}

export default function MemberReport() {
  const { year: curYear } = useCurrentDate();
  const [year, setYear] = useState(curYear);
  const [downloading, setDownloading] = useState(false);
  const years = generateYearOptions(curYear);

  const { data: report, isLoading } = useGetMembersReport({ year });
  const { data: settings } = useGetSettings();

  const handlePdf = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      generateMembersReportPdf({
        orgName: report.orgName,
        year: report.year,
        totalMembers: report.totalMembers,
        activeMembers: report.activeMembers,
        totalCollected: report.totalCollected,
        collectionRate: report.collectionRate,
        members: report.members,
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="p-4 md:p-8 space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="w-7 h-7 text-blue-600" />
            Member Report
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">Payment matrix for all members by month</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <NowBadge />
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handlePdf} disabled={downloading || !report} size="sm" className="gap-1.5">
            <Download className="w-4 h-4" />
            {downloading ? "Generating…" : "Download PDF"}
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {report && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          {[
            { label: "Total Members", value: report.totalMembers, sub: `${report.activeMembers} active`, icon: Users, color: "text-blue-600", bg: "bg-blue-50", iconColor: "text-blue-500" },
            { label: "Total Collected", value: formatCurrency(report.totalCollected), sub: `Year ${year}`, icon: TrendingUp, color: "text-green-700", bg: "bg-green-50", iconColor: "text-green-500" },
            { label: "Collection Rate", value: `${report.collectionRate}%`, sub: "of active member slots", icon: CheckCircle, color: "text-emerald-700", bg: "bg-emerald-50", iconColor: "text-emerald-500" },
            { label: "Avg per Member", value: report.totalMembers > 0 ? formatCurrency(report.totalCollected / report.totalMembers) : "€0,00", sub: "collected this year", icon: TrendingUp, color: "text-slate-800", bg: "bg-slate-50", iconColor: "text-slate-500" },
          ].map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.label} className="stat-card border hover:border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1 pt-3 px-3 md:px-5">
                  <CardTitle className="text-xs md:text-sm font-medium text-muted-foreground leading-tight">{s.label}</CardTitle>
                  <div className={`w-7 h-7 md:w-9 md:h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                    <Icon className={`h-3.5 w-3.5 md:h-4 md:w-4 ${s.iconColor}`} />
                  </div>
                </CardHeader>
                <CardContent className="px-3 md:px-5 pb-3">
                  <div className={`text-xl md:text-2xl font-bold ${s.color}`}>{s.value}</div>
                  {s.sub && <p className="text-xs text-muted-foreground mt-0.5">{s.sub}</p>}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Payment matrix table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base md:text-lg">Payment Matrix - {year}</CardTitle>
          <p className="text-xs text-muted-foreground">Green = paid, red = unpaid. Scroll right to see all months.</p>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-10 bg-muted/40 rounded animate-pulse" />
              ))}
            </div>
          ) : !report?.members.length ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No members found.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[900px]">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left py-2.5 px-3 font-semibold text-xs text-slate-600 whitespace-nowrap sticky left-0 bg-slate-50 z-10 min-w-[44px]">#</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-xs text-slate-600 whitespace-nowrap sticky left-10 bg-slate-50 z-10 min-w-[90px]">Reg No.</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-xs text-slate-600 whitespace-nowrap min-w-[140px]">Name</th>
                    <th className="text-left py-2.5 px-3 font-semibold text-xs text-slate-600 whitespace-nowrap hidden md:table-cell">Status</th>
                    {SHORT_MONTHS.map((m) => (
                      <th key={m} className="text-center py-2.5 px-1 font-semibold text-xs text-slate-600 w-10">{m}</th>
                    ))}
                    <th className="text-center py-2.5 px-2 font-semibold text-xs text-slate-600 whitespace-nowrap">Paid</th>
                    <th className="text-right py-2.5 px-3 font-semibold text-xs text-slate-600 whitespace-nowrap">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.members.map((member, idx) => (
                    <tr key={member.id} className="border-b last:border-0 hover:bg-slate-50/60 transition-colors">
                      <td className="py-2 px-3 text-muted-foreground text-xs sticky left-0 bg-white group-hover:bg-slate-50 z-10">{idx + 1}</td>
                      <td className="py-2 px-3 font-mono text-xs font-semibold text-blue-700 sticky left-10 bg-white z-10">{member.registrationNumber}</td>
                      <td className="py-2 px-3 font-medium whitespace-nowrap">{member.name}</td>
                      <td className="py-2 px-3 hidden md:table-cell">
                        <Badge
                          variant="outline"
                          className={member.status === "active"
                            ? "border-green-200 text-green-700 bg-green-50 text-xs"
                            : "border-slate-200 text-slate-500 bg-slate-50 text-xs"}
                        >
                          {member.status}
                        </Badge>
                      </td>
                      {member.monthlyPayments.map((mp) => (
                        <td key={mp.month} className="py-1 px-0.5 text-center">
                          {mp.paid ? (
                            <div
                              className="mx-auto w-8 h-7 rounded flex items-center justify-center bg-green-100 text-green-700 font-semibold text-[10px] leading-none"
                              title={`€${mp.amount.toFixed(2)}`}
                            >
                              {mp.amount > 0 ? `€${mp.amount.toFixed(0)}` : "✓"}
                            </div>
                          ) : (
                            <div className="mx-auto w-8 h-7 rounded flex items-center justify-center bg-red-50 text-red-300 text-xs">-</div>
                          )}
                        </td>
                      ))}
                      <td className="py-2 px-2 text-center">
                        <span className={`text-xs font-bold ${member.totalPaidMonths === 12 ? "text-green-700" : member.totalPaidMonths === 0 ? "text-red-500" : "text-orange-600"}`}>
                          {member.totalPaidMonths}/12
                        </span>
                      </td>
                      <td className="py-2 px-3 text-right font-semibold text-sm">{formatCurrency(member.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                {report.members.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 bg-slate-50 font-semibold">
                      <td colSpan={4} className="py-2.5 px-3 text-xs text-slate-600">TOTAL ({report.members.length} members)</td>
                      {Array.from({ length: 12 }, (_, i) => {
                        const paidCount = report.members.filter((m) => m.monthlyPayments[i]?.paid).length;
                        return (
                          <td key={i} className="py-2 px-0.5 text-center">
                            <div className={`mx-auto w-8 text-[10px] font-bold ${paidCount === report.members.length ? "text-green-700" : paidCount === 0 ? "text-slate-300" : "text-blue-600"}`}>
                              {paidCount > 0 ? paidCount : ""}
                            </div>
                          </td>
                        );
                      })}
                      <td className="py-2.5 px-2 text-center text-xs font-bold text-slate-700">
                        {report.members.reduce((s, m) => s + m.totalPaidMonths, 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-green-700">{formatCurrency(report.totalCollected)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
