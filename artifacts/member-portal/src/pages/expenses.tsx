import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListExpenses,
  getListExpensesQueryKey,
  useCreateExpense,
  useUpdateExpense,
  useDeleteExpense,
  useGetExpenseSummary,
  getGetExpenseSummaryQueryKey,
} from "@workspace/api-client-react";
import { useCurrentDate, MONTHS, generateYearOptions, formatCurrency, monthLabel } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const CATEGORIES = ["Utilities", "Maintenance", "Events", "Salaries", "Other"];

type ExpenseForm = { title: string; amount: string; category: string; month: string; year: string; notes: string };

const emptyForm = (month: number, year: number): ExpenseForm => ({
  title: "", amount: "", category: "Other", month: String(month), year: String(year), notes: "",
});

export default function Expenses() {
  const { month: curMonth, year: curYear } = useCurrentDate();
  const [filterMonth, setFilterMonth] = useState<string>("all");
  const [filterYear, setFilterYear] = useState(curYear);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<ExpenseForm>(emptyForm(curMonth, curYear));
  const { toast } = useToast();
  const qc = useQueryClient();

  const params = {
    year: filterYear,
    ...(filterMonth !== "all" ? { month: Number(filterMonth) } : {}),
  };

  const { data: expenses, isLoading } = useListExpenses(params, {
    query: { queryKey: getListExpensesQueryKey(params) },
  });

  const { data: summary } = useGetExpenseSummary(params, {
    query: { queryKey: getGetExpenseSummaryQueryKey(params) },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetExpenseSummaryQueryKey() });
  };

  const createExpense = useCreateExpense({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: "Expense added" }); },
      onError: () => toast({ title: "Error", description: "Could not save expense", variant: "destructive" }),
    },
  });

  const updateExpense = useUpdateExpense({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); toast({ title: "Expense updated" }); },
      onError: () => toast({ title: "Error", description: "Could not update expense", variant: "destructive" }),
    },
  });

  const deleteExpense = useDeleteExpense({
    mutation: {
      onSuccess: () => { invalidate(); setDeleteId(null); toast({ title: "Expense deleted" }); },
    },
  });

  const openAdd = () => {
    setEditId(null);
    setForm(emptyForm(curMonth, curYear));
    setDialogOpen(true);
  };

  const openEdit = (e: NonNullable<typeof expenses>[number]) => {
    setEditId(e.id);
    setForm({ title: e.title, amount: String(e.amount), category: e.category, month: String(e.month), year: String(e.year), notes: e.notes ?? "" });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = {
      title: form.title.trim(),
      amount: Number(form.amount),
      category: form.category,
      month: Number(form.month),
      year: Number(form.year),
      notes: form.notes.trim() || undefined,
    };
    if (!data.title || !data.amount || !data.month || !data.year) {
      toast({ title: "Fill in all required fields", variant: "destructive" }); return;
    }
    if (editId != null) {
      updateExpense.mutate({ id: editId, data });
    } else {
      createExpense.mutate({ data });
    }
  };

  const categoryColor: Record<string, string> = {
    Utilities: "bg-blue-100 text-blue-700",
    Maintenance: "bg-yellow-100 text-yellow-700",
    Events: "bg-purple-100 text-purple-700",
    Salaries: "bg-green-100 text-green-700",
    Other: "bg-gray-100 text-gray-700",
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track organizational spending</p>
        </div>
        <Button onClick={openAdd} className="gap-2"><Plus className="w-4 h-4" /> Add Expense</Button>
      </div>

      <div className="flex gap-3">
        <Select value={filterMonth} onValueChange={setFilterMonth}>
          <SelectTrigger className="w-36"><SelectValue placeholder="All months" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={String(filterYear)} onValueChange={(v) => setFilterYear(Number(v))}>
          <SelectTrigger className="w-24"><SelectValue /></SelectTrigger>
          <SelectContent>
            {generateYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-5 pb-4">
              <div className="text-2xl font-bold text-orange-600">{formatCurrency(summary.totalExpenses)}</div>
              <div className="text-xs text-muted-foreground mt-1">Total Expenses</div>
            </CardContent>
          </Card>
          {summary.byCategory.slice(0, 3).map((cat) => (
            <Card key={cat.category}>
              <CardContent className="pt-5 pb-4">
                <div className="text-2xl font-bold">{formatCurrency(cat.total)}</div>
                <div className="text-xs text-muted-foreground mt-1">{cat.category} ({cat.count})</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Expense Records</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">Loading...</div>
          ) : !expenses?.length ? (
            <div className="text-center py-12 text-muted-foreground">No expenses recorded yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.title}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${categoryColor[e.category] ?? "bg-gray-100 text-gray-700"}`}>{e.category}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{monthLabel(e.month)} {e.year}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(e.amount)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{e.notes ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(e)}><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(e.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId != null ? "Edit Expense" : "Add Expense"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Electricity bill" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Amount (€) *</Label>
                <Input type="number" step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Category *</Label>
                <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Month *</Label>
                <Select value={form.month} onValueChange={(v) => setForm((f) => ({ ...f, month: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Year *</Label>
                <Select value={form.year} onValueChange={(v) => setForm((f) => ({ ...f, year: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {generateYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createExpense.isPending || updateExpense.isPending}>
              {editId != null ? "Save Changes" : "Add Expense"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete expense?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteId && deleteExpense.mutate({ id: deleteId })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
