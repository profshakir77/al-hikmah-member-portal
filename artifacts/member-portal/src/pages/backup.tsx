import { useState } from "react";
import { exportBackup } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Backup() {
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setLoading(true);
    try {
      const data = await exportBackup();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `memberportal-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      const ts = new Date().toLocaleString("en-GB");
      setLastExport(ts);
      toast({ title: "Backup downloaded", description: `Exported at ${ts}` });
    } catch {
      toast({ title: "Export failed", description: "Could not export backup data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Backup & Export</h1>
        <p className="text-muted-foreground mt-1">Download a full backup of all portal data</p>
      </div>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Full Data Export</CardTitle>
          <CardDescription>
            Downloads a complete JSON backup file containing all members, payment records, expenses, and settings.
            Store this file safely — it can be used to restore or audit your data.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-1">
            <p>The backup includes:</p>
            <ul className="list-disc pl-5 space-y-0.5">
              <li>All member records with registration numbers</li>
              <li>Complete payment history</li>
              <li>All expense records</li>
              <li>Organization settings</li>
            </ul>
          </div>

          {lastExport && (
            <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-md px-3 py-2">
              <CheckCircle className="w-4 h-4" />
              Last exported: {lastExport}
            </div>
          )}

          <Button onClick={handleExport} disabled={loading} className="gap-2">
            <Download className="w-4 h-4" />
            {loading ? "Exporting..." : "Export Backup (.json)"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
