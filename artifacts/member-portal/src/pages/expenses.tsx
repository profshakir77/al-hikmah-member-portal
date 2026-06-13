import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListExpenses, getListExpensesQueryKey,
  useCreateExpense, useUpdateExpense, useDeleteExpense,
  useGetExpenseSummary, getGetExpenseSummaryQueryKey,
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
import { Plus, Pencil, Trash2, Receipt } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAutoBackup } from "@/hooks/use-auto-backup";

const CATEGORIES = ["Utilities", "Maintenance", "Events", "Salaries", "Other"];

type ExpenseForm = { title: string; amount: string; category: string; month: string; year: string; notes: string };
const emptyForm = (month: number, year: number): ExpenseForm => ({
  title: "", amount: "", category: "Other", month: String(month), year: String(year), notes: "",
});

const categoryStyle: Record<string, string> = {
  Utilities: "bg-blue-100 text-blue-700 border-blue-200",
  Maintenance: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Events: "bg-purple-100 text-purple-700 border-purple-200",
  Salaries: "bg-green-100 text-green-700 border-green-200",
  Other: "bg-slate-100 text-slate-600 border-slate-200",
};

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
  const { save: autoSave } = useAutoBackup();

  const params = { year: filterYear, ...(filterMonth !== "all" ? { month: Number(filterMonth) } : {}) };
  const { data: expenses, isLoading } = useListExpenses(params, { query: { queryKey: getListExpensesQueryKey(params) } });
  const { data: summary } = useGetExpenseSummary(params, { query: { queryKey: getGetExpenseSummaryQueryKey(params) } });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getListExpensesQueryKey() });
    qc.invalidateQueries({ queryKey: getGetExpenseSummaryQueryKey() });
  };

  const createExpense = useCreateExpense({
    mutation: {
      onSuccess: (e) => { invalidate(); setDialogOpen(false); autoSave(`Expense added: ${e.title}`); toast({ title: "Expense added" }); },
      onError: () => toast({ title: "Error", description: "Could not save expense", variant: "destructive" }),
    },
  });

  const updateExpense = useUpdateExpense({
    mutation: {
      onSuccess: (e) => { invalidate(); setDialogOpen(false); autoSave(`Expense updated: ${e.title}`); toast({ title: "Expense updated" }); },
      onError: () => toast({ title: "Error", description: "Could not update expense", variant: "destructive" }),
    },
  });

  const deleteExpense = useDeleteExpense({
    mutation: {
      onSuccess: () => { invalidate(); setDeleteId(null); autoSave("Expense deleted"); toast({ title: "Expense deleted" }); },
    },
  });

  const openAdd = () => { setEditId(null); setForm(emptyForm(curMonth, curYear)); setDialogOpen(true); };
  const openEdit = (e: NonNullable<typeof expenses>[number]) => {
    setEditId(e.id);
    setForm({ title: e.title, amount: String(e.amount), category: e.category, month: String(e.month), year: String(e.year), notes: e.notes ?? "" });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    const data = { title: form.title.trim(), amount: Number(form.amount), category: form.category, month: Number(form.month), year: Number(form.year), notes: form.notes.trim() || undefined };
    if (!data.title || !data.amount || !data.month || !data.year) { toast({ title: "Fill in all required fields", variant: "destructive" }); return; }
    if (editId != null) { updateExpense.mutate({ id: editId, data }); }
    else { createExpense.mutate({ data }); }
  };

  return (
    <div className="p-8 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
          <p className="text-muted-foreground mt-1">Track organizational spending</p>
        </div>
        <Button onClick={openAdd} className="gap-2 btn-ripple shadow-md shadow-primary/20"><Plus className="w-4 h-4" /> Add Expense</Button>
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
          <Card className="stat-card hover:border-orange-300/50">
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-orange-50 flex items-center justify-center">
                <Receipt className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <div className="text-xl font-bold text-orange-600">{formatCurrency(summary.totalExpenses)}</div>
                <div className="text-xs text-muted-foreground">Total Expenses</div>
              </div>
            </CardContent>
          </Card>
          {summary.byCategory.slice(0, 3).map((cat) => (
            <Card key={cat.category} className="stat-card hover:border-primary/20">
              <CardContent className="pt-5 pb-4">
                <div className="text-xl font-bold">{formatCurrency(cat.total)}</div>
                <div className="text-xs text-muted-foreground mt-1">{cat.category} ({cat.count})</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader><CardTitle>Expense Records</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />)}</div>
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
                  <TableRow key={e.id} className="table-row-hover group">
                    <TableCell className="font-semibold">{e.title}</TableCell>
                    <TableCell><Badge className={`text-xs ${categoryStyle[e.category] ?? "bg-slate-100 text-slate-600"}`}>{e.category}</Badge></TableCell>
                    <TableCell className="text-muted-foreground">{monthLabel(e.month)} {e.year}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(e.amount)}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{e.notes ?? "-"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(e)} className="hover:bg-blue-50 hover:text-blue-700"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-red-50" onClick={() => setDeleteId(e.id)}><Trash2 className="w-4 h-4" /></Button>
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
          <DialogHeader><DialogTitle>{editId != null ? "Edit Expense" : "Add Expense"}</DialogTitle></DialogHeader>
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
                  <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Month *</Label>
                <Select value={form.month} onValueChange={(v) => setForm((f) => ({ ...f, month: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m) => <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Year *</Label>
                <Select value={form.year} onValueChange={(v) => setForm((f) => ({ ...f, year: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{generateYearOptions().map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}</SelectContent>
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
            <Button onClick={handleSubmit} disabled={createExpense.isPending || updateExpense.isPending} className="btn-ripple">
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
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteId && deleteExpense.mutate({ id: deleteId })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
