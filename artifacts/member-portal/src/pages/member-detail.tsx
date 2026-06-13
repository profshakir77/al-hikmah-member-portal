import { useState } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMember,
  getGetMemberQueryKey,
  useUpdateMember,
  useDeleteMember,
  useGetMemberPayments,
  getGetMemberPaymentsQueryKey,
  getListMembersQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, Pencil, Trash2, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, monthLabel } from "@/lib/date-utils";

export default function MemberDetail() {
  const { id } = useParams<{ id: string }>();
  const memberId = Number(id);
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const { data: member, isLoading } = useGetMember(memberId, {
    query: { enabled: !!memberId, queryKey: getGetMemberQueryKey(memberId) },
  });

  const { data: payments } = useGetMemberPayments(memberId, {
    query: { enabled: !!memberId, queryKey: getGetMemberPaymentsQueryKey(memberId) },
  });

  const [form, setForm] = useState({ name: "", phone: "", email: "", address: "", notes: "", status: "active", joinDate: "" });

  const startEdit = () => {
    if (!member) return;
    setForm({
      name: member.name,
      phone: member.phone,
      email: member.email ?? "",
      address: member.address ?? "",
      notes: member.notes ?? "",
      status: member.status,
      joinDate: member.joinDate,
    });
    setEditing(true);
  };

  const updateMember = useUpdateMember({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMemberQueryKey(memberId) });
        qc.invalidateQueries({ queryKey: getListMembersQueryKey() });
        setEditing(false);
        toast({ title: "Member updated" });
      },
      onError: () => toast({ title: "Error", description: "Could not update member", variant: "destructive" }),
    },
  });

  const deleteMember = useDeleteMember({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getListMembersQueryKey() });
        toast({ title: "Member deleted" });
        setLocation("/members");
      },
    },
  });

  const handleSave = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast({ title: "Name and phone are required", variant: "destructive" }); return;
    }
    updateMember.mutate({
      id: memberId,
      data: {
        name: form.name,
        phone: form.phone,
        email: form.email || null,
        address: form.address || null,
        notes: form.notes || null,
        status: form.status as "active" | "inactive",
        joinDate: form.joinDate,
      },
    });
  };

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading...</div>;
  if (!member) return <div className="p-8 text-muted-foreground">Member not found.</div>;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/members">
          <Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="w-4 h-4" /> Members</Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">{member.name}</h1>
        <Badge className="font-mono text-sm">{member.registrationNumber}</Badge>
        <Badge variant={member.status === "active" ? "default" : "secondary"} className="capitalize">{member.status}</Badge>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Profile</CardTitle>
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X className="w-4 h-4" /></Button>
                    <Button size="sm" onClick={handleSave} disabled={updateMember.isPending}><Check className="w-4 h-4 mr-1" /> Save</Button>
                  </>
                ) : (
                  <>
                    <Button size="sm" variant="outline" onClick={startEdit} className="gap-2"><Pencil className="w-4 h-4" /> Edit</Button>
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10" onClick={() => setConfirmDelete(true)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {editing ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Name *</Label>
                      <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone *</Label>
                      <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <Input value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="inactive">Inactive</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Address</Label>
                    <Input value={form.address} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Join Date</Label>
                    <Input type="date" value={form.joinDate} onChange={(e) => setForm((f) => ({ ...f, joinDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
                  </div>
                </div>
              ) : (
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                  {[
                    ["Phone", member.phone],
                    ["Email", member.email ?? "—"],
                    ["Address", member.address ?? "—"],
                    ["Join Date", member.joinDate],
                    ["Member Since", new Date(member.createdAt).toLocaleDateString("en-GB")],
                    ["Notes", member.notes ?? "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="space-y-0.5">
                      <dt className="text-muted-foreground text-xs uppercase tracking-wide">{label}</dt>
                      <dd className="font-medium">{value}</dd>
                    </div>
                  ))}
                </dl>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
            <CardContent className="p-0">
              {!payments?.length ? (
                <div className="text-center py-8 text-muted-foreground text-sm">No payments yet.</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{monthLabel(p.month)} {p.year}</TableCell>
                        <TableCell className="text-sm font-medium">{formatCurrency(p.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {member.name}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the member and all their payment records.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteMember.mutate({ id: memberId })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
