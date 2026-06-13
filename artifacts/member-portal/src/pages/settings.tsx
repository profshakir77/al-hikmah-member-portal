import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetSettings, getGetSettingsQueryKey, useUpdateSettings } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const { toast } = useToast();

  const [orgName, setOrgName] = useState("");
  const [dueAmount, setDueAmount] = useState("");
  const [currency, setCurrency] = useState("EUR");
  const [template, setTemplate] = useState("");

  useEffect(() => {
    if (settings) {
      setOrgName(settings.organizationName);
      setDueAmount(String(settings.monthlyDueAmount));
      setCurrency(settings.currency);
      setTemplate(settings.whatsappAlertTemplate);
    }
  }, [settings]);

  const updateSettings = useUpdateSettings({
    mutation: {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
        toast({ title: "Settings saved" });
      },
      onError: () => toast({ title: "Error", description: "Could not save settings", variant: "destructive" }),
    },
  });

  const handleSave = () => {
    const amount = Number(dueAmount);
    if (!orgName.trim() || isNaN(amount) || amount <= 0) {
      toast({ title: "Check your inputs", description: "Organization name and valid amount are required", variant: "destructive" });
      return;
    }
    updateSettings.mutate({
      data: {
        organizationName: orgName.trim(),
        monthlyDueAmount: amount,
        currency: currency.trim() || "EUR",
        whatsappAlertTemplate: template.trim(),
      },
    });
  };

  if (isLoading) return <div className="p-8 text-muted-foreground">Loading settings...</div>;

  return (
    <div className="p-8 space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Settings</h1>

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Organization Settings</CardTitle>
          <CardDescription>Manage your organization details and portal configuration.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-1.5">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input id="orgName" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="dueAmount">Monthly Due Amount (€)</Label>
              <Input id="dueAmount" type="number" step="0.01" min="0" value={dueAmount} onChange={(e) => setDueAmount(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currency">Currency Code</Label>
              <Input id="currency" value={currency} onChange={(e) => setCurrency(e.target.value)} placeholder="EUR" maxLength={3} />
              <p className="text-xs text-muted-foreground">ISO code, e.g. EUR, USD</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="template">WhatsApp Alert Template</Label>
            <Textarea
              id="template"
              value={template}
              onChange={(e) => setTemplate(e.target.value)}
              rows={4}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Placeholders: <code className="bg-muted px-1 rounded">{"{name}"}</code>{" "}
              <code className="bg-muted px-1 rounded">{"{month}"}</code>{" "}
              <code className="bg-muted px-1 rounded">{"{year}"}</code>{" "}
              <code className="bg-muted px-1 rounded">{"{amount}"}</code>{" "}
              <code className="bg-muted px-1 rounded">{"{currency}"}</code>
            </p>
          </div>

          <Button onClick={handleSave} disabled={updateSettings.isPending}>
            {updateSettings.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
