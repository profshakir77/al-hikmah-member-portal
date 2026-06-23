import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useListContributions, getListContributionsQueryKey,
  useCreateContribution, useUpdateContribution, useDeleteContribution,
} from "@workspace/api-client-react";
import { useCurrentDate, MONTHS, generateYearOptions, formatCurrency } from "@/lib/date-utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, Pencil, Trash2, Users, Landmark } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAutoBackup } from "@/hooks/use-auto-backup";

type ContribType = "participant" | "bank_transfer";

type ContribForm = {
  name: string;
  phone: string;
  amount: string;
  date: string;
  reference: string;
  notes: string;
  year: string;
  month: string;
};

const emptyForm = (year: number, date: string): ContribForm => ({
  name: "", phone: "", amount: "", date, reference: "", notes: "",
  year: String(year), month: "",
});

function ContribSection({ type, label }: { type: ContribType; label: string }) {
  const { year: curYear } = useCurrentDate();
  const today = new Date().toISOString().split("T")[0]!;
  const [filterYear, setFilterYear] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<ContribForm>(emptyForm(curYear, today));
  const { toast } = useToast();
  const qc = useQueryClient();
  const { save: autoSave } = useAutoBackup();

  const yearOptions = generateYearOptions(curYear);

  const params = {
    type,
    ...(filterYear !== "all" ? { year: Number(filterYear) } : {}),
  };
  const { data: rows = [], isLoading } = useListContributions(params, {
    query: { queryKey: getListContributionsQueryKey(params) },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: getListContributionsQueryKey() });

  const createMutation = useCreateContribution({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); autoSave(`${label} added`); toast({ title: `${label} record added` }); },
      onError: () => toast({ title: "Error", description: "Could not save", variant: "destructive" }),
    },
  });

  const updateMutation = useUpdateContribution({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); autoSave(`${label} updated`); toast({ title: `${label} record updated` }); },
      onError: () => toast({ title: "Error", description: "Could not save", variant: "destructive" }),
    },
  });

  const deleteMutation = useDeleteContribution({
    mutation: {
      onSuccess: () => { invalidate(); setDeleteId(null); autoSave(`${label} deleted`); toast({ title: "Record deleted" }); },
    },
  });

  const openNew = () => {
    setEditId(null);
    setForm(emptyForm(curYear, today));
    setDialogOpen(true);
  };

  const openEdit = (row: (typeof rows)[0]) => {
    setEditId(row.id);
    setForm({
      name: row.name,
      phone: row.phone ?? "",
      amount: String(row.amount),
      date: row.date,
      reference: row.reference ?? "",
      notes: row.notes ?? "",
      year: String(row.year),
      month: row.month != null ? String(row.month) : "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) return toast({ title: "Name is required", variant: "destructive" });
    if (!form.amount || isNaN(Number(form.amount))) return toast({ title: "Valid amount is required", variant: "destructive" });
    if (!form.date) return toast({ title: "Date is required", variant: "destructive" });

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim() || undefined,
      amount: Number(form.amount),
      date: form.date,
      type,
      reference: form.reference.trim() || undefined,
      notes: form.notes.trim() || undefined,
      year: Number(form.year),
      month: form.month ? Number(form.month) : undefined,
    };

    if (editId !== null) {
      updateMutation.mutate({ id: editId, data: payload });
    } else {
      createMutation.mutate({ data: payload });
    }
  };

  const totalAmount = rows.reduce((s, r) => s + Number(r.amount), 0);

  const f = (k: keyof ContribForm) => (v: string) => setForm((p) => ({ ...p, [k]: v }));

  const isBankTransfer = type === "bank_transfer";

  return (
    <div className="space-y-4">
      {/* Summary card */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <Card className="stat-card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}s</p>
            <p className="text-2xl font-bold mt-1">{rows.length}</p>
          </CardContent>
        </Card>
        <Card className="stat-card">
          <CardContent className="pt-5 pb-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Received</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{formatCurrency(totalAmount)}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + Add */}
      <div className="flex flex-wrap gap-3 items-center">
        <Select value={filterYear} onValueChange={setFilterYear}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Year" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Years</SelectItem>
            {yearOptions.map((y) => (
              <SelectItem key={y} value={String(y)}>{y}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto">
          <Button onClick={openNew} size="sm" className="gap-1.5">
            <Plus className="w-4 h-4" /> Add {label}
          </Button>
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                {isBankTransfer && <TableHead>Phone</TableHead>}
                <TableHead>Amount</TableHead>
                <TableHead>Date Submitted</TableHead>
                {isBankTransfer && <TableHead>Reference</TableHead>}
                <TableHead>Notes</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={isBankTransfer ? 7 : 5} className="text-center py-8 text-muted-foreground">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isBankTransfer ? 7 : 5} className="text-center py-10 text-muted-foreground">
                    No records yet. Click "Add {label}" to add one.
                  </TableCell>
                </TableRow>
              ) : rows.map((row) => (
                <TableRow key={row.id} className="table-row-hover">
                  <TableCell className="font-medium">{row.name}</TableCell>
                  {isBankTransfer && <TableCell className="text-muted-foreground">{row.phone ?? "-"}</TableCell>}
                  <TableCell className="font-semibold text-green-700">{formatCurrency(Number(row.amount))}</TableCell>
                  <TableCell>{row.date}</TableCell>
                  {isBankTransfer && <TableCell className="text-muted-foreground">{row.reference ?? "-"}</TableCell>}
                  <TableCell className="text-muted-foreground max-w-[180px] truncate">{row.notes ?? "-"}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)}>
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteId(row.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editId !== null ? "Edit" : "Add"} {label}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Name *</Label>
                <Input value={form.name} onChange={(e) => f("name")(e.target.value)} placeholder="Full name" />
              </div>
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => f("phone")(e.target.value)} placeholder="+92..." />
              </div>
              <div className="space-y-1">
                <Label>Amount (EUR) *</Label>
                <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => f("amount")(e.target.value)} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label>Date Submitted *</Label>
                <Input type="date" value={form.date} onChange={(e) => f("date")(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Year *</Label>
                <Select value={form.year} onValueChange={f("year")}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {yearOptions.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {isBankTransfer && (
                <div className="col-span-2 space-y-1">
                  <Label>Bank Reference / Slip No.</Label>
                  <Input value={form.reference} onChange={(e) => f("reference")(e.target.value)} placeholder="Optional reference number" />
                </div>
              )}
              <div className="col-span-2 space-y-1">
                <Label>Notes</Label>
                <Input value={form.notes} onChange={(e) => f("notes")(e.target.value)} placeholder="Optional notes" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createMutation.isPending || updateMutation.isPending}>
              {editId !== null ? "Save Changes" : `Add ${label}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirm */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete record?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteId !== null && deleteMutation.mutate({ id: deleteId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function Contributions() {
  return (
    <div className="space-y-6 page-enter">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Contributions</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track non-member participants and bank transfer contributors separately. No WhatsApp alerts sent for these records.
        </p>
      </div>

      <Tabs defaultValue="participant">
        <TabsList className="grid w-full max-w-sm grid-cols-2">
          <TabsTrigger value="participant" className="gap-1.5">
            <Users className="w-4 h-4" /> Participants
          </TabsTrigger>
          <TabsTrigger value="bank_transfer" className="gap-1.5">
            <Landmark className="w-4 h-4" /> Bank Transfers
          </TabsTrigger>
        </TabsList>

        <TabsContent value="participant" className="mt-4">
          <ContribSection type="participant" label="Participant" />
        </TabsContent>

        <TabsContent value="bank_transfer" className="mt-4">
          <ContribSection type="bank_transfer" label="Bank Transfer" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
