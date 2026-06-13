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
    <div className="p-4 md:p-8 space-y-5 md:space-y-6 page-enter">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Members</h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {members?.length ?? 0} total · {active} active · {inactive} inactive
          </p>
        </div>
        <Link href="/members/new">
          <Button className="gap-2 btn-ripple shadow-md shadow-primary/20 shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Member</span>
            <span className="sm:hidden">Add</span>
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {[
          { label: "Total", value: members?.length ?? 0, color: "text-slate-800", bg: "bg-slate-50" },
          { label: "Active", value: active, color: "text-green-600", bg: "bg-green-50" },
          { label: "Inactive", value: inactive, color: "text-slate-500", bg: "bg-slate-50" },
        ].map((s) => (
          <Card key={s.label} className="stat-card hover:border-primary/20 transition-all">
            <CardContent className="pt-4 pb-3 px-3 md:px-6 flex items-center gap-2 md:gap-3">
              <div className={`w-8 h-8 md:w-9 md:h-9 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                <Users className={`w-3.5 h-3.5 md:w-4 md:h-4 ${s.color}`} />
              </div>
              <div>
                <div className={`text-lg md:text-xl font-bold ${s.color}`}>{s.value}</div>
                <div className="text-xs text-muted-foreground">{s.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <CardTitle className="text-base md:text-lg">Member Registry</CardTitle>
            <div className="sm:flex-1 sm:max-w-xs">
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reg No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden sm:table-cell">Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Joined</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {members.map((m) => (
                    <TableRow key={m.id} className="table-row-hover cursor-pointer group">
                      <TableCell className="font-mono text-xs md:text-sm font-medium text-primary">{m.registrationNumber}</TableCell>
                      <TableCell className="font-semibold text-sm">{m.name}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{m.phone}</TableCell>
                      <TableCell>
                        <Badge className={`text-xs capitalize ${m.status === "active" ? "bg-green-100 text-green-700 border-green-200" : "bg-slate-100 text-slate-600 border-slate-200"}`}>
                          {m.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{m.joinDate}</TableCell>
                      <TableCell>
                        <Link href={`/members/${m.id}`}>
                          <Button variant="ghost" size="sm" className="gap-1 opacity-60 group-hover:opacity-100 transition-opacity p-1 md:px-3">
                            <span className="hidden md:inline">View</span>
                            <ChevronRight className="w-3 h-3" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
