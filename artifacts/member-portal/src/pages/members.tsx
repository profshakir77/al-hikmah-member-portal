import { useState } from "react";
import { Link } from "wouter";
import { useListMembers } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, ChevronRight, Users } from "lucide-react";

export default function Members() {
  const [search, setSearch] = useState("");
  const { data: members, isLoading } = useListMembers({ search });

  const active = members?.filter((m) => m.status === "active").length ?? 0;
  const inactive = (members?.length ?? 0) - active;

  return (
    <div className="p-8 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground mt-1">
            {members?.length ?? 0} total · {active} active · {inactive} inactive
          </p>
        </div>
        <Link href="/members/new">
          <Button className="gap-2 btn-ripple shadow-md shadow-primary/20 hover:shadow-primary/30 transition-shadow">
            <Plus className="w-4 h-4" /> Add Member
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: members?.length ?? 0, color: "text-slate-800", bg: "bg-slate-50" },
          { label: "Active", value: active, color: "text-green-600", bg: "bg-green-50" },
          { label: "Inactive", value: inactive, color: "text-slate-500", bg: "bg-slate-50" },
        ].map((s) => (
          <Card key={s.label} className="stat-card hover:border-primary/20 transition-all">
            <CardContent className="pt-5 pb-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${s.bg} flex items-center justify-center`}>
                <Users className={`w-4 h-4 ${s.color}`} />
              </div>
              <div>
                <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-3">
            <CardTitle>Member Registry</CardTitle>
            <div className="flex-1 max-w-xs">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search name, reg. no., phone…"
                  className="pl-8 h-8 text-sm"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-muted/50 animate-pulse" />
              ))}
            </div>
          ) : !members?.length ? (
            <div className="text-center py-12 text-muted-foreground">No members yet.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Reg No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id} className="table-row-hover cursor-pointer group">
                    <TableCell className="font-mono text-sm font-medium text-primary">{m.registrationNumber}</TableCell>
                    <TableCell className="font-semibold">{m.name}</TableCell>
                    <TableCell className="text-muted-foreground">{m.phone}</TableCell>
                    <TableCell>
                      <Badge
                        className={`text-xs capitalize ${m.status === "active" ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}
                      >
                        {m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{m.joinDate}</TableCell>
                    <TableCell>
                      <Link href={`/members/${m.id}`}>
                        <Button variant="ghost" size="sm" className="gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          View <ChevronRight className="w-3 h-3" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
