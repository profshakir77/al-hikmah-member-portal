import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetPaymentStatus,
  getGetPaymentStatusQueryKey,
  useCreatePayment,
  useDeletePayment,
  getListPaymentsQueryKey,
  useGetSettings,
} from "@workspace/api-client-react";
import { useCurrentDate, MONTHS, generateYearOptions, formatCurrency, monthLabel } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WhatsAppButton } from "@/components/whatsapp-button";
import {
  CheckCircle, XCircle, Trash2, CreditCard,
  ChevronDown, Zap, PenLine, CalendarDays,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAutoBackup } from "@/hooks/use-auto-backup";

type Step = "menu" | "custom" | "date";

function buildReceiptUrl(settings: { whatsappReceiptTemplate: string; currency: string }, phone: string, name: string, amount: number, month: number, year: number) {
  const monthName = new Date(year, month - 1).toLocaleString("default", { month: "long" });
  const text = settings.whatsappReceiptTemplate
    .replace("{name}", name)
    .replace("{amount}", amount.toString())
    .replace("{currency}", settings.currency)
    .replace("{month}", monthName)
    .replace("{year}", year.toString());
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

function PaymentPicker({
  memberId,
  memberName,
  memberPhone,
  standardAmount,
  month,
  year,
  settings,
  onPay,
  isPending,
}: {
  memberId: number;
  memberName: string;
  memberPhone: string;
  standardAmount: number;
  month: number;
  year: number;
  settings: { whatsappReceiptTemplate: string; currency: string } | undefined;
  onPay: (memberId: number, amount: number, paidAt: Date) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("menu");
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [date, setDate] = useState<Date>(new Date());

  const reset = () => { setStep("menu"); setPendingAmount(null); setCustom(""); setDate(new Date()); };
  const handleClose = (o: boolean) => { setOpen(o); if (!o) reset(); };
  const pickDate = (amount: number) => { setPendingAmount(amount); setDate(new Date()); setStep("date"); };

  const handleCustomNext = () => {
    const val = parseFloat(custom);
    if (!val || val <= 0) return;
    pickDate(val);
  };

  const handleConfirm = () => {
    if (pendingAmount == null) return;
    // Open WhatsApp synchronously (inside user gesture) before any async work
    if (settings && memberPhone) {
      const url = buildReceiptUrl(settings, memberPhone, memberName, pendingAmount, month, year);
      window.open(url, "_blank");
    }
    onPay(memberId, pendingAmount, date);
    setOpen(false);
    reset();
  };

  const formattedDate = date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <Popover open={open} onOpenChange={handleClose}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          disabled={isPending}
          className="gap-1 hover:bg-green-50 hover:border-green-400 hover:text-green-700 transition-colors text-xs px-2 md:px-3"
        >
          Mark Paid <ChevronDown className="w-3 h-3" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-60 md:w-64 p-2" align="end">
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-2 pb-1.5 border-b mb-1.5 flex items-center justify-between">
          <span className="truncate">{memberName}</span>
          {step !== "menu" && (
            <button className="text-muted-foreground hover:text-foreground text-[10px] shrink-0 ml-2" onClick={() => setStep("menu")}>
              ← Back
            </button>
          )}
        </div>

        {step === "menu" && (
          <div className="space-y-1">
            <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm hover:bg-green-50 hover:text-green-700 transition-colors group" onClick={() => pickDate(standardAmount)}>
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0">
                <Zap className="w-3 h-3 text-green-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Standard due</div>
                <div className="text-xs text-muted-foreground group-hover:text-green-600">{formatCurrency(standardAmount)}</div>
              </div>
            </button>
            <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm hover:bg-blue-50 hover:text-blue-700 transition-colors group" onClick={() => pickDate(standardAmount / 2)}>
              <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                <CreditCard className="w-3 h-3 text-blue-600" />
              </div>
              <div className="text-left">
                <div className="font-medium">Half payment</div>
                <div className="text-xs text-muted-foreground group-hover:text-blue-600">{formatCurrency(standardAmount / 2)}</div>
              </div>
            </button>
            <button className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-md text-sm hover:bg-slate-100 transition-colors" onClick={() => setStep("custom")}>
              <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                <PenLine className="w-3 h-3 text-slate-500" />
              </div>
              <div className="text-left">
                <div className="font-medium">Custom amount</div>
                <div className="text-xs text-muted-foreground">Enter any amount</div>
              </div>
            </button>
          </div>
        )}

        {step === "custom" && (
          <div className="space-y-3 pt-1 px-1">
            <div className="text-xs text-muted-foreground">Enter payment amount (€)</div>
            <div className="flex gap-2">
              <Input type="number" step="0.01" min="0.01" placeholder="0.00" value={custom} onChange={(e) => setCustom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCustomNext()} className="h-8 text-sm" autoFocus />
              <Button size="sm" className="h-8 px-3 shrink-0" onClick={handleCustomNext} disabled={!custom || Number(custom) <= 0}>Next</Button>
            </div>
          </div>
        )}

        {step === "date" && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 py-1 text-xs text-muted-foreground">
              <CalendarDays className="w-3.5 h-3.5" />
              Date for <strong>{formatCurrency(pendingAmount ?? 0)}</strong>
            </div>
            <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} disabled={(d) => d > new Date()} className="rounded-md border-0 p-0 scale-90 origin-top" />
            <div className="px-1 pb-1 space-y-2">
              <div className="flex items-center gap-2 text-xs bg-blue-50 border border-blue-100 rounded px-2 py-1.5 text-blue-700">
                <CalendarDays className="w-3 h-3 shrink-0" />
                <span className="font-medium">{formattedDate}</span>
              </div>
              <Button className="w-full h-8 text-sm btn-ripple" onClick={handleConfirm}>Confirm Payment</Button>
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default function Payments() {
  const { month: curMonth, year: curYear } = useCurrentDate();
  const [month, setMonth] = useState(curMonth);
  const [year, setYear] = useState(curYear);
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: settings } = useGetSettings();
  const { save: autoSave } = useAutoBackup();

  const { data: statuses, isLoading } = useGetPaymentStatus({ month, year });
  const standardAmount = Number(settings?.monthlyDueAmount ?? 10);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetPaymentStatusQueryKey({ month, year }) });
    qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
  };

  const createPayment = useCreatePayment({
    mutation: {
      onSuccess: () => { invalidate(); autoSave(`Payment recorded - ${monthLabel(month)} ${year}`); toast({ title: "Payment recorded" }); },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
        toast({ title: "Error", description: msg ?? "Could not record payment", variant: "destructive" });
      },
    },
  });

  const deletePayment = useDeletePayment({
    mutation: {
      onSuccess: () => { invalidate(); autoSave(`Payment removed - ${monthLabel(month)} ${year}`); toast({ title: "Payment removed" }); },
    },
  });

  const handlePay = (memberId: number, amount: number, paidAt: Date) => {
    createPayment.mutate({ data: { memberId, amount, month, year, paidAt: paidAt.toISOString() } });
  };

  const paid = statuses?.filter((s) => s.paid) ?? [];
  const unpaid = statuses?.filter((s) => !s.paid) ?? [];

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">Track monthly dues for {monthLabel(month)} {year}</p>
        </div>
        <div className="flex gap-2 shrink-0">
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
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {[
          { label: "Paid", value: paid.length, color: "text-green-600", bg: "bg-green-50" },
          { label: "Unpaid", value: unpaid.length, color: "text-red-600", bg: "bg-red-50" },
          { label: "Collected", value: formatCurrency(paid.reduce((s, p) => s + (p.amount ?? 0), 0)), color: "text-slate-800", bg: "bg-slate-50" },
        ].map((s) => (
          <Card key={s.label} className="stat-card hover:border-primary/20">
            <CardContent className="pt-4 pb-3 px-3 md:px-6 flex items-center gap-2 md:gap-3">
              <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <CreditCard className={`w-3.5 h-3.5 md:w-4 md:h-4 ${s.color}`} />
              </div>
              <div>
                <div className={`text-base md:text-xl font-bold ${s.color} truncate`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 rounded-xl bg-muted/50 animate-pulse" />)}
        </div>
      ) : (
        <Card className="hover:shadow-md transition-shadow duration-200">
          <CardHeader className="pb-2 md:pb-4">
            <CardTitle className="text-base md:text-lg">Member Payment Status - {monthLabel(month)} {year}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reg No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Amount</TableHead>
                    <TableHead className="hidden md:table-cell">Paid On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {statuses?.map((s) => (
                    <TableRow key={s.memberId} className="table-row-hover">
                      <TableCell className="font-mono text-xs md:text-sm font-medium text-primary">{s.registrationNumber}</TableCell>
                      <TableCell className="font-semibold text-sm">{s.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{s.phone}</TableCell>
                      <TableCell>
                        {s.paid ? (
                          <Badge className="bg-green-100 text-green-700 border-green-200 text-xs">
                            <CheckCircle className="w-3 h-3 mr-1" /> Paid
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">
                            <XCircle className="w-3 h-3 mr-1" /> Unpaid
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{s.amount != null ? formatCurrency(s.amount) : "-"}</TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">
                        {s.paidAt ? new Date(s.paidAt).toLocaleDateString("en-GB") : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 md:gap-2">
                          {s.paid ? (
                            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-red-50 transition-colors p-1 md:p-2" onClick={() => s.paymentId && deletePayment.mutate({ id: s.paymentId })}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          ) : (
                            <>
                              <PaymentPicker memberId={s.memberId} memberName={s.name} memberPhone={s.phone} standardAmount={standardAmount} month={month} year={year} settings={settings ?? undefined} onPay={handlePay} isPending={createPayment.isPending} />
                              <WhatsAppButton phone={s.phone} name={s.name} month={month} year={year} amount={settings?.monthlyDueAmount} />
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
