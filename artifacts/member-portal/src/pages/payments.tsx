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
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { CheckCircle, XCircle, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Payments() {
  const { month: curMonth, year: curYear } = useCurrentDate();
  const [month, setMonth] = useState(curMonth);
  const [year, setYear] = useState(curYear);
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: settings } = useGetSettings();

  const { data: statuses, isLoading } = useGetPaymentStatus({ month, year });

  const createPayment = useCreatePayment({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetPaymentStatusQueryKey({ month, year }) });
        qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
        toast({ title: "Payment recorded" });
      },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
        toast({ title: "Error", description: msg ?? "Could not record payment", variant: "destructive" });
      },
    },
  });

  const deletePayment = useDeletePayment({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetPaymentStatusQueryKey({ month, year }) });
        qc.invalidateQueries({ queryKey: getListPaymentsQueryKey() });
        toast({ title: "Payment removed" });
      },
    },
  });

  const handleMarkPaid = (memberId: number) => {
    createPayment.mutate({
      data: {
        memberId,
        amount: settings?.monthlyDueAmount ?? 10,
        month,
        year,
      },
    });
  };

  const paid = statuses?.filter((s) => s.paid) ?? [];
  const unpaid = statuses?.filter((s) => !s.paid) ?? [];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">Track monthly dues for {monthLabel(month)} {year}</p>
        </div>
        <div className="flex gap-3">
          <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((m) => (
                <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {generateYearOptions().map((y) => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{paid.length}</div>
            <div className="text-sm text-muted-foreground">Paid</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-destructive">{unpaid.length}</div>
            <div className="text-sm text-muted-foreground">Unpaid</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{formatCurrency(paid.reduce((s, p) => s + (p.amount ?? 0), 0))}</div>
            <div className="text-sm text-muted-foreground">Collected</div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading payments...</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Member Payment Status — {monthLabel(month)} {year}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reg No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Paid On</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses?.map((s) => (
                  <TableRow key={s.memberId}>
                    <TableCell className="font-mono text-sm">{s.registrationNumber}</TableCell>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.phone}</TableCell>
                    <TableCell>
                      {s.paid ? (
                        <Badge className="bg-green-100 text-green-700 border-green-200">
                          <CheckCircle className="w-3 h-3 mr-1" /> Paid
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="bg-red-100 text-red-700 border-red-200">
                          <XCircle className="w-3 h-3 mr-1" /> Unpaid
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>{s.amount != null ? formatCurrency(s.amount) : "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {s.paidAt ? new Date(s.paidAt).toLocaleDateString("en-GB") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {s.paid ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => s.paymentId && deletePayment.mutate({ id: s.paymentId })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkPaid(s.memberId)}
                              disabled={createPayment.isPending}
                            >
                              Mark Paid
                            </Button>
                            <WhatsAppButton phone={s.phone} name={s.name} month={month} year={year} amount={settings?.monthlyDueAmount} />
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
