import { useState } from "react";
import { useGetTaxAnnualReport } from "@workspace/api-client-react";
import { generateYearOptions, formatCurrency, monthLabel } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, TrendingUp, TrendingDown, Minus, FileText, Building2 } from "lucide-react";
import { generateTaxPdf } from "@/lib/pdf-report";

const QUARTER_COLORS = [
  "bg-blue-50 border-blue-200 text-blue-700",
  "bg-violet-50 border-violet-200 text-violet-700",
  "bg-amber-50 border-amber-200 text-amber-700",
  "bg-emerald-50 border-emerald-200 text-emerald-700",
];

function SurplusIcon({ value }: { value: number }) {
  if (value > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
  if (value < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
  return <Minus className="w-4 h-4 text-slate-400" />;
}

export default function Tax() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [downloading, setDownloading] = useState(false);

  const { data: report, isLoading } = useGetTaxAnnualReport({ year });

  const handlePdf = () => {
    if (!report) return;
    setDownloading(true);
    try {
      generateTaxPdf({ report, year });
    } finally {
      setDownloading(false);
    }
  };

  const totalCategoryCount = report?.expensesByCategory.reduce((s, c) => s + c.count, 0) ?? 0;

  return (
    <div className="p-4 md:p-8 space-y-6 page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-indigo-600" />
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Tax Report</h1>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">Annual income and expense summary for tax filing</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
            <SelectContent>
              {generateYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            onClick={handlePdf}
            disabled={!report || downloading}
            className="gap-2 btn-ripple shadow-sm"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{downloading ? "Generating…" : "Download PDF"}</span>
            <span className="sm:hidden">PDF</span>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-muted/50 animate-pulse" />)}
        </div>
      ) : !report ? (
        <div className="text-center py-16 text-muted-foreground">No data available for {year}</div>
      ) : (
        <>
          {/* Org identity banner */}
          <Card className="border-indigo-100 bg-indigo-50/40">
            <CardContent className="py-4 px-5 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
                <Building2 className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <div className="font-bold text-base text-indigo-900">{report.orgName}</div>
                <div className="text-xs text-indigo-600 mt-0.5">
                  Tax Year: {year} &nbsp;·&nbsp; {report.activeMembers} active members &nbsp;·&nbsp; {report.totalMembers} total members
                </div>
              </div>
              <div className="sm:ml-auto flex items-center gap-2">
                <Badge className="bg-indigo-100 text-indigo-700 border-indigo-200 text-xs">
                  Fiscal Year {year}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Top summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card className="border-green-200 bg-green-50/30 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">Total Income</div>
                    <div className="text-2xl md:text-3xl font-bold text-green-700">{formatCurrency(report.totalIncome)}</div>
                    <div className="text-xs text-green-600 mt-1">Membership dues collected</div>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-green-100 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-orange-200 bg-orange-50/30 hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-medium text-orange-700 uppercase tracking-wide mb-1">Total Expenditure</div>
                    <div className="text-2xl md:text-3xl font-bold text-orange-700">{formatCurrency(report.totalExpenses)}</div>
                    <div className="text-xs text-orange-600 mt-1">{totalCategoryCount} expense records</div>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-orange-100 flex items-center justify-center">
                    <TrendingDown className="w-5 h-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={`hover:shadow-md transition-shadow ${report.grossSurplus >= 0 ? "border-emerald-200 bg-emerald-50/30" : "border-red-200 bg-red-50/30"}`}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className={`text-xs font-medium uppercase tracking-wide mb-1 ${report.grossSurplus >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {report.grossSurplus >= 0 ? "Net Surplus" : "Net Deficit"}
                    </div>
                    <div className={`text-2xl md:text-3xl font-bold ${report.grossSurplus >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                      {formatCurrency(Math.abs(report.grossSurplus))}
                    </div>
                    <div className={`text-xs mt-1 ${report.grossSurplus >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                      Income minus expenditure
                    </div>
                  </div>
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${report.grossSurplus >= 0 ? "bg-emerald-100" : "bg-red-100"}`}>
                    <SurplusIcon value={report.grossSurplus} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quarterly breakdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg">Quarterly Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {report.quarters.map((q, i) => (
                  <div key={q.quarter} className={`rounded-xl border p-4 ${QUARTER_COLORS[i]}`}>
                    <div className="text-xs font-bold uppercase tracking-wide opacity-70 mb-2">{q.label}</div>
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-xs">
                        <span className="opacity-70">Income</span>
                        <span className="font-semibold">{formatCurrency(q.income)}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="opacity-70">Expenses</span>
                        <span className="font-semibold">{formatCurrency(q.expenses)}</span>
                      </div>
                      <div className="border-t border-current/20 pt-1.5 flex justify-between text-sm">
                        <span className="font-medium opacity-80">Net</span>
                        <span className={`font-bold ${q.net >= 0 ? "" : "opacity-70"}`}>{formatCurrency(q.net)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Income & expenses side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Monthly income */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Monthly Income - {year}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Month</TableHead>
                        <TableHead className="text-right">Payments</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {report.incomeByMonth.map((m) => (
                        <TableRow key={m.month} className={`table-row-hover ${m.collected === 0 ? "opacity-40" : ""}`}>
                          <TableCell className="font-medium text-sm">{monthLabel(m.month)}</TableCell>
                          <TableCell className="text-right text-muted-foreground text-sm">{m.paymentCount}</TableCell>
                          <TableCell className={`text-right font-semibold text-sm ${m.collected > 0 ? "text-green-700" : "text-muted-foreground"}`}>
                            {formatCurrency(m.collected)}
                          </TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="bg-green-50/60 font-bold">
                        <TableCell className="font-bold text-sm">Total</TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {report.incomeByMonth.reduce((s, m) => s + m.paymentCount, 0)}
                        </TableCell>
                        <TableCell className="text-right text-sm text-green-700 font-bold">
                          {formatCurrency(report.totalIncome)}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Expenses by category */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Expenditure by Category - {year}</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {report.expensesByCategory.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground text-sm">No expenses recorded for {year}</div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Category</TableHead>
                          <TableHead className="text-right">Count</TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead className="text-right">% of Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.expensesByCategory.map((cat) => {
                          const pct = report.totalExpenses > 0 ? (cat.total / report.totalExpenses) * 100 : 0;
                          return (
                            <TableRow key={cat.category} className="table-row-hover">
                              <TableCell>
                                <Badge className="bg-orange-100 text-orange-700 border-orange-200 text-xs">{cat.category}</Badge>
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground text-sm">{cat.count}</TableCell>
                              <TableCell className="text-right font-semibold text-sm text-orange-700">{formatCurrency(cat.total)}</TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">{pct.toFixed(1)}%</TableCell>
                            </TableRow>
                          );
                        })}
                        <TableRow className="bg-orange-50/60">
                          <TableCell className="font-bold text-sm">Total</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">{totalCategoryCount}</TableCell>
                          <TableCell className="text-right text-sm text-orange-700 font-bold">{formatCurrency(report.totalExpenses)}</TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">100%</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Net summary table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg">Annual Financial Summary - Tax Year {year}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Line Item</TableHead>
                      <TableHead className="text-right">Amount (€)</TableHead>
                      <TableHead className="hidden sm:table-cell">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow className="table-row-hover">
                      <TableCell className="font-semibold text-green-700">Total Income (Membership Dues)</TableCell>
                      <TableCell className="text-right font-bold text-green-700">{formatCurrency(report.totalIncome)}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">All member payments received in {year}</TableCell>
                    </TableRow>
                    <TableRow className="table-row-hover">
                      <TableCell className="font-semibold text-orange-700">Total Expenditure</TableCell>
                      <TableCell className="text-right font-bold text-orange-700">({formatCurrency(report.totalExpenses)})</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{report.expensesByCategory.length} categories of expense</TableCell>
                    </TableRow>
                    <TableRow className={`${report.grossSurplus >= 0 ? "bg-emerald-50/60" : "bg-red-50/60"}`}>
                      <TableCell className={`font-bold text-base ${report.grossSurplus >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {report.grossSurplus >= 0 ? "Net Surplus" : "Net Deficit"}
                      </TableCell>
                      <TableCell className={`text-right font-bold text-base ${report.grossSurplus >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                        {formatCurrency(report.grossSurplus)}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">
                        {report.grossSurplus >= 0 ? "Surplus to be carried forward" : "Deficit to be reviewed"}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
