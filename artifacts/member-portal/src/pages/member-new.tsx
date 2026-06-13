import { useQueryClient } from "@tanstack/react-query";
import { useCreateMember, getListMembersQueryKey } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

type FormData = {
  name: string;
  phone: string;
  email: string;
  address: string;
  notes: string;
  joinDate: string;
};

export default function MemberNew() {
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const { toast } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: { joinDate: new Date().toISOString().split("T")[0] },
  });

  const createMember = useCreateMember({
    mutation: {
      onSuccess: (member) => {
        qc.invalidateQueries({ queryKey: getListMembersQueryKey() });
        toast({ title: `Member added — ${member.registrationNumber}` });
        setLocation("/members");
      },
      onError: () => toast({ title: "Error", description: "Could not add member", variant: "destructive" }),
    },
  });

  const onSubmit = (data: FormData) => {
    createMember.mutate({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email || undefined,
        address: data.address || undefined,
        notes: data.notes || undefined,
        joinDate: data.joinDate || undefined,
      },
    });
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/members">
          <Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="w-4 h-4" /> Back</Button>
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Add Member</h1>
      </div>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Member Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" {...register("name", { required: "Name is required" })} />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone *</Label>
                <Input id="phone" {...register("phone", { required: "Phone is required" })} placeholder="+39..." />
                {errors.phone && <p className="text-xs text-destructive">{errors.phone.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="joinDate">Join Date</Label>
                <Input id="joinDate" type="date" {...register("joinDate")} />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register("address")} placeholder="Street, City" />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" {...register("notes")} rows={3} placeholder="Any additional notes" />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={createMember.isPending}>
                {createMember.isPending ? "Adding..." : "Add Member"}
              </Button>
              <Link href="/members">
                <Button type="button" variant="outline">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
