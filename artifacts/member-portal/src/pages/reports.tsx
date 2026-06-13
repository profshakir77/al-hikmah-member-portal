import { useState } from "react";
import {
  useGetMonthlyReport,
  useGetYearlyReport,
  useGetSettings,
} from "@workspace/api-client-react";
import { useCurrentDate, MONTHS, generateYearOptions, formatCurrency, monthLabel } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Download, Clock } from "lucide-react";
import { generateMonthlyPdf, generateYearlyPdf, printedAt } from "@/lib/pdf-report";

function NowBadge() {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-blue-50 border border-blue-100 rounded-full px-3 py-1 shrink-0">
      <Clock className="w-3 h-3 text-blue-500" />
      <span className="hidden sm:inline">{printedAt()}</span>
      <span className="sm:hidden">{new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
    </div>
  );
}

function MonthlyReport({ orgName }: { orgName: string }) {
  const { month: curMonth, year: curYear } = useCurrentDate();
  const [month, setMonth] = useState(curMonth);
  const [year, setYear] = useState(curYear);
  const [downloading, setDownloading] = useState(false);

  const { data: report, isLoading } = useGetMonthlyReport({ month, year });

  const handlePdf = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      generateMonthlyPdf({
        orgName,
        month: monthLabel(month),
        year,
        stats: {
          totalMembers: report.totalMembers,
          paid: report.paid,
          unpaid: report.unpaid,
          totalCollected: report.totalCollected,
          expectedTotal: report.expectedTotal,
          totalExpenses: report.totalExpenses,
          net: report.net,
          collectionRate: report.collectionRate,
        },
        rows: report.payments.map((p) => ({
          regNo: p.registrationNumber,
          name: p.name,
          status: p.paid ? "Paid" : "Unpaid",
          amount: p.amount != null ? formatCurrency(p.amount) : "-",
          date: p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-GB") : "-",
        })),
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-32 md:w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-20 md:w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {generateYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <NowBadge />
          <Button size="sm" onClick={handlePdf} disabled={!report || downloading} className="gap-2 btn-ripple shadow-sm shrink-0">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{downloading ? "Generating…" : "Download PDF"}</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />)}</div>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
            {[
              { label: "Total Members", value: report.totalMembers, className: "" },
              { label: "Paid", value: report.paid, className: "text-green-600" },
              { label: "Unpaid", value: report.unpaid, className: "text-destructive" },
              { label: "Collected", value: formatCurrency(report.totalCollected), className: "" },
              { label: "Expenses", value: formatCurrency(report.totalExpenses), className: "text-orange-600" },
              { label: "Net", value: formatCurrency(report.net), className: report.net >= 0 ? "text-green-600" : "text-destructive" },
            ].map((stat) => (
              <Card key={stat.label} className="stat-card hover:border-primary/20">
                <CardContent className="pt-4 pb-3 px-3 md:px-5">
                  <div className={`text-lg md:text-xl font-bold ${stat.className}`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Collection Rate</span>
                <span className="text-sm font-bold">{report.collectionRate.toFixed(1)}%</span>
              </div>
              <Progress value={report.collectionRate} className="h-2" />
              <div className="text-xs text-muted-foreground mt-1">Expected: {formatCurrency(report.expectedTotal)}</div>
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="text-base md:text-lg">Member Breakdown - {monthLabel(month)} {year}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reg No.</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="hidden sm:table-cell">Amount</TableHead>
                      <TableHead className="hidden sm:table-cell">Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.payments.map((p) => (
                      <TableRow key={p.memberId} className="table-row-hover">
                        <TableCell className="font-mono text-xs md:text-sm">{p.registrationNumber}</TableCell>
                        <TableCell className="text-sm">{p.name}</TableCell>
                        <TableCell>
                          {p.paid ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 text-xs"><CheckCircle className="w-3 h-3 mr-1" /> Paid</Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 border-red-200 text-xs"><XCircle className="w-3 h-3 mr-1" /> Unpaid</Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">{p.amount != null ? formatCurrency(p.amount) : "-"}</TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">
                          {p.paidAt ? new Date(p.paidAt).toLocaleDateString("en-GB") : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">No data</div>
      )}
    </div>
  );
}

function YearlyReport({ orgName }: { orgName: string }) {
  const { year: curYear } = useCurrentDate();
  const [year, setYear] = useState(curYear);
  const [downloading, setDownloading] = useState(false);

  const { data: report, isLoading } = useGetYearlyReport({ year });

  const handlePdf = async () => {
    if (!report) return;
    setDownloading(true);
    try {
      generateYearlyPdf({
        orgName,
        year,
        totals: {
          totalCollected: report.totalCollected,
          totalExpected: report.totalExpected,
          totalExpenses: report.totalExpenses,
          net: report.net,
        },
        rows: report.monthlyBreakdown.map((m) => ({
          month: monthLabel(m.month),
          paid: m.paid,
          unpaid: m.unpaid,
          collected: formatCurrency(m.collected),
          expenses: formatCurrency(m.expenses),
          net: formatCurrency(m.net),
          isPositive: m.net >= 0,
        })),
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-5 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
          <SelectTrigger className="w-20 md:w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {generateYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <NowBadge />
          <Button size="sm" onClick={handlePdf} disabled={!report || downloading} className="gap-2 btn-ripple shadow-sm shrink-0">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{downloading ? "Generating…" : "Download PDF"}</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted/50 animate-pulse" />)}</div>
      ) : report ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {[
              { label: "Total Collected", value: formatCurrency(report.totalCollected), className: "text-green-600" },
              { label: "Total Expected", value: formatCurrency(report.totalExpected), className: "" },
              { label: "Total Expenses", value: formatCurrency(report.totalExpenses), className: "text-orange-600" },
              { label: "Net", value: formatCurrency(report.net), className: report.net >= 0 ? "text-green-600" : "text-destructive" },
            ].map((stat) => (
              <Card key={stat.label} className="stat-card hover:border-primary/20">
                <CardContent className="pt-4 pb-3 px-3 md:px-5">
                  <div className={`text-base md:text-xl font-bold ${stat.className}`}>{stat.value}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="hover:shadow-md transition-shadow duration-200">
            <CardHeader className="pb-2 md:pb-4">
              <CardTitle className="text-base md:text-lg">Monthly Breakdown - {year}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead className="hidden sm:table-cell">Unpaid</TableHead>
                      <TableHead>Collected</TableHead>
                      <TableHead className="hidden sm:table-cell">Expenses</TableHead>
                      <TableHead>Net</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.monthlyBreakdown.map((m) => (
                      <TableRow key={m.month} className="table-row-hover">
                        <TableCell className="font-medium text-sm">{monthLabel(m.month)}</TableCell>
                        <TableCell className="text-green-600">{m.paid}</TableCell>
                        <TableCell className="hidden sm:table-cell text-destructive">{m.unpaid}</TableCell>
                        <TableCell className="text-sm">{formatCurrency(m.collected)}</TableCell>
                        <TableCell className="hidden sm:table-cell text-orange-600">{formatCurrency(m.expenses)}</TableCell>
                        <TableCell className={`font-medium text-sm ${m.net >= 0 ? "text-green-600" : "text-destructive"}`}>
                          {formatCurrency(m.net)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center py-12 text-muted-foreground">No data</div>
      )}
    </div>
  );
}

export default function Reports() {
  const { data: settings } = useGetSettings();
  const orgName = settings?.organizationName ?? "Al-Hikmah Community Center";

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6 page-enter">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">Financial summaries with PDF export</p>
      </div>
      <Tabs defaultValue="monthly">
        <TabsList>
          <TabsTrigger value="monthly">Monthly</TabsTrigger>
          <TabsTrigger value="yearly">Yearly</TabsTrigger>
        </TabsList>
        <TabsContent value="monthly" className="mt-4 md:mt-6">
          <MonthlyReport orgName={orgName} />
        </TabsContent>
        <TabsContent value="yearly" className="mt-4 md:mt-6">
          <YearlyReport orgName={orgName} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
