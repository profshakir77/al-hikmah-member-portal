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
  const [alertTemplate, setAlertTemplate] = useState("");
  const [receiptTemplate, setReceiptTemplate] = useState("");

  useEffect(() => {
    if (settings) {
      setOrgName(settings.organizationName);
      setDueAmount(String(settings.monthlyDueAmount));
      setCurrency(settings.currency);
      setAlertTemplate(settings.whatsappAlertTemplate);
      setReceiptTemplate(settings.whatsappReceiptTemplate);
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
        whatsappAlertTemplate: alertTemplate.trim(),
        whatsappReceiptTemplate: receiptTemplate.trim(),
      },
    });
  };

  const placeholders = (
    <p className="text-xs text-muted-foreground">
      Placeholders:{" "}
      {["{name}", "{month}", "{year}", "{amount}", "{currency}"].map((p) => (
        <code key={p} className="bg-muted px-1 rounded mr-1">{p}</code>
      ))}
    </p>
  );

  if (isLoading) return <div className="p-4 md:p-8 text-muted-foreground">Loading settings...</div>;

  return (
    <div className="p-4 md:p-8 space-y-5 md:space-y-6 page-enter">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-0.5 text-sm">Configure your portal and WhatsApp messages</p>
      </div>

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
            <Label htmlFor="alertTemplate">
              WhatsApp Alert Template
              <span className="ml-2 text-xs font-normal text-muted-foreground">(sent manually for unpaid members)</span>
            </Label>
            <Textarea
              id="alertTemplate"
              value={alertTemplate}
              onChange={(e) => setAlertTemplate(e.target.value)}
              rows={3}
              className="font-mono text-sm"
            />
            {placeholders}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="receiptTemplate">
              WhatsApp Receipt Template
              <span className="ml-2 text-xs font-normal text-green-600 font-medium">auto-sent on "Mark Paid"</span>
            </Label>
            <Textarea
              id="receiptTemplate"
              value={receiptTemplate}
              onChange={(e) => setReceiptTemplate(e.target.value)}
              rows={3}
              className="font-mono text-sm border-green-200 focus-visible:ring-green-400"
            />
            {placeholders}
          </div>

          <Button onClick={handleSave} disabled={updateSettings.isPending} className="btn-ripple">
            {updateSettings.isPending ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
