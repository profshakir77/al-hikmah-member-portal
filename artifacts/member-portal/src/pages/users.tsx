import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useListUsers, getListUsersQueryKey, useCreateUser, useUpdateUser, useDeleteUser } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, Shield, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAutoBackup } from "@/hooks/use-auto-backup";

type UserForm = { username: string; name: string; role: string; password: string };
const emptyForm = (): UserForm => ({ username: "", name: "", role: "viewer", password: "" });

export default function Users() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm());
  const { toast } = useToast();
  const qc = useQueryClient();
  const { save: autoSave } = useAutoBackup();

  const { data: users, isLoading } = useListUsers();
  const invalidate = () => qc.invalidateQueries({ queryKey: getListUsersQueryKey() });

  const createUser = useCreateUser({
    mutation: {
      onSuccess: (u) => { invalidate(); setDialogOpen(false); autoSave(`User added: ${u.username}`); toast({ title: "User created" }); },
      onError: (e: unknown) => {
        const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error;
        toast({ title: "Error", description: msg ?? "Could not create user", variant: "destructive" });
      },
    },
  });

  const updateUser = useUpdateUser({
    mutation: {
      onSuccess: () => { invalidate(); setDialogOpen(false); autoSave("User updated"); toast({ title: "User updated" }); },
      onError: () => toast({ title: "Error", description: "Could not update user", variant: "destructive" }),
    },
  });

  const deleteUser = useDeleteUser({
    mutation: {
      onSuccess: () => { invalidate(); setDeleteId(null); autoSave("User deleted"); toast({ title: "User deleted" }); },
    },
  });

  const openAdd = () => { setEditId(null); setForm(emptyForm()); setDialogOpen(true); };
  const openEdit = (u: NonNullable<typeof users>[number]) => {
    setEditId(u.id);
    setForm({ username: u.username, name: u.name, role: u.role, password: "" });
    setDialogOpen(true);
  };

  const handleSubmit = () => {
    if (!form.name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (editId != null) {
      const data: { name?: string; role?: string; password?: string } = { name: form.name, role: form.role };
      if (form.password.trim()) data.password = form.password;
      updateUser.mutate({ id: editId, data });
    } else {
      if (!form.username.trim() || !form.password.trim()) { toast({ title: "Username and password required", variant: "destructive" }); return; }
      createUser.mutate({ data: { username: form.username, name: form.name, role: form.role, password: form.password } });
    }
  };

  const admins = users?.filter((u) => u.role === "admin").length ?? 0;
  const viewers = (users?.length ?? 0) - admins;

  return (
    <div className="p-8 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage portal access and roles</p>
        </div>
        <Button onClick={openAdd} className="gap-2 btn-ripple shadow-md shadow-primary/20"><Plus className="w-4 h-4" /> Add User</Button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: users?.length ?? 0, icon: Shield, color: "text-slate-800", bg: "bg-slate-50" },
          { label: "Admins", value: admins, icon: Shield, color: "text-blue-600", bg: "bg-blue-50" },
          { label: "Viewers", value: viewers, icon: Eye, color: "text-slate-500", bg: "bg-slate-50" },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.label} className="stat-card hover:border-primary/20">
              <CardContent className="pt-5 pb-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
                </div>
                <div>
                  <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-muted-foreground">{s.label}</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader><CardTitle>Portal Users</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />)}</div>
          ) : !users?.length ? (
            <div className="text-center py-12 text-muted-foreground">No users yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id} className="table-row-hover group">
                    <TableCell className="font-mono text-sm">{u.username}</TableCell>
                    <TableCell className="font-semibold">{u.name}</TableCell>
                    <TableCell>
                      <Badge className={`text-xs ${u.role === "admin" ? "bg-blue-100 text-blue-700 border-blue-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                        {u.role === "admin" ? <Shield className="w-3 h-3 mr-1 inline" /> : <Eye className="w-3 h-3 mr-1 inline" />}
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(u.createdAt).toLocaleDateString("en-GB")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(u)} className="hover:bg-blue-50 hover:text-blue-700"><Pencil className="w-4 h-4" /></Button>
                        <Button variant="ghost" size="sm" className="text-destructive hover:bg-red-50" onClick={() => setDeleteId(u.id)}><Trash2 className="w-4 h-4" /></Button>
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
          <DialogHeader><DialogTitle>{editId != null ? "Edit User" : "Add User"}</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            {editId == null && (
              <div className="space-y-1.5">
                <Label>Username *</Label>
                <Input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))} placeholder="e.g. secretary" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Full Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>Role *</Label>
              <Select value={form.role} onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin — full access</SelectItem>
                  <SelectItem value="viewer">Viewer — read only</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{editId != null ? "New Password (leave blank to keep)" : "Password *"}</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={createUser.isPending || updateUser.isPending} className="btn-ripple">
              {editId != null ? "Save Changes" : "Create User"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteId != null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove their portal access.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={() => deleteId && deleteUser.mutate({ id: deleteId })}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
