import { useGetSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function Settings() {
  const { data: settings, isLoading } = useGetSettings();

  if (isLoading) return <div className="p-8">Loading settings...</div>;
  if (!settings) return <div className="p-8">Error loading settings</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>Manage your organization details and system configurations.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label>Organization Name</Label>
            <div className="p-2 bg-muted rounded-md">{settings.organizationName}</div>
          </div>
          <div className="grid gap-2">
            <Label>Monthly Due Amount ({settings.currency})</Label>
            <div className="p-2 bg-muted rounded-md">{settings.monthlyDueAmount}</div>
          </div>
          <div className="grid gap-2">
            <Label>WhatsApp Alert Template</Label>
            <div className="p-2 bg-muted rounded-md text-sm font-mono whitespace-pre-wrap">{settings.whatsappAlertTemplate}</div>
          </div>
          <p className="text-sm text-muted-foreground mt-4">Settings modification form placeholder.</p>
        </CardContent>
      </Card>
    </div>
  );
}