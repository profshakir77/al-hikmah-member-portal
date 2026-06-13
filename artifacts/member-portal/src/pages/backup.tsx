import { useState, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { exportBackup } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Upload, CheckCircle, Clock, AlertTriangle, RefreshCw, Database } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { getAutoBackups, type BackupSnapshot } from "@/hooks/use-auto-backup";

export default function Backup() {
  const [lastExport, setLastExport] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const [pendingFile, setPendingFile] = useState<unknown | null>(null);
  const [autoSnapshots, setAutoSnapshots] = useState<BackupSnapshot[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  useEffect(() => {
    setAutoSnapshots(getAutoBackups());
    const handler = () => setAutoSnapshots(getAutoBackups());
    window.addEventListener("autobackup", handler);
    return () => window.removeEventListener("autobackup", handler);
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportBackup();
      downloadJson(data, `memberportal-backup-${today()}.json`);
      setLastExport(new Date().toLocaleString("en-GB"));
      toast({ title: "Backup downloaded" });
    } catch {
      toast({ title: "Export failed", variant: "destructive" });
    } finally {
      setExporting(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data?.members) { toast({ title: "Invalid backup file", variant: "destructive" }); return; }
        setPendingFile(data);
        setConfirmImport(true);
      } catch {
        toast({ title: "Could not parse file", variant: "destructive" });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleImport = async () => {
    if (!pendingFile) return;
    setImporting(true);
    try {
      const res = await fetch("/api/backup/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingFile),
      });
      if (!res.ok) {
        const err = await res.json() as { error?: string };
        throw new Error(err.error ?? "Import failed");
      }
      await qc.invalidateQueries();
      toast({ title: "Backup restored successfully", description: "All data has been replaced." });
    } catch (e: unknown) {
      toast({ title: "Import failed", description: (e as Error).message, variant: "destructive" });
    } finally {
      setImporting(false);
      setConfirmImport(false);
      setPendingFile(null);
    }
  };

  const restoreSnapshot = (snap: BackupSnapshot) => {
    setPendingFile(snap.data);
    setConfirmImport(true);
  };

  return (
    <div className="p-8 space-y-6 page-enter">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Backup & Restore</h1>
        <p className="text-muted-foreground mt-1">Export data, restore from a file, or replay an auto-saved snapshot</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Export */}
        <Card className="border-2 hover:border-primary/40 hover:shadow-lg transition-all duration-200 stat-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
                <Download className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <CardTitle className="text-base">Export Backup</CardTitle>
                <CardDescription className="text-xs">Download full JSON snapshot</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
              <li>All member records &amp; registration numbers</li>
              <li>Complete payment history</li>
              <li>All expense records</li>
              <li>Organization settings</li>
            </ul>
            {lastExport && (
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
                <CheckCircle className="w-4 h-4 shrink-0" />
                Last exported: {lastExport}
              </div>
            )}
            <Button onClick={handleExport} disabled={exporting} className="w-full gap-2 btn-ripple">
              <Download className="w-4 h-4" />
              {exporting ? "Exporting..." : "Export Backup (.json)"}
            </Button>
          </CardContent>
        </Card>

        {/* Import */}
        <Card className="border-2 hover:border-orange-400/40 hover:shadow-lg transition-all duration-200 stat-card">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
                <Upload className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <CardTitle className="text-base">Restore from File</CardTitle>
                <CardDescription className="text-xs">Upload a .json backup to restore</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>This replaces <strong>all current data</strong> with the contents of the backup file.</span>
            </div>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleFileSelect} />
            <Button
              variant="outline"
              onClick={() => fileRef.current?.click()}
              disabled={importing}
              className="w-full gap-2 border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400 transition-all"
            >
              <Upload className="w-4 h-4" />
              Choose Backup File
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Auto-saved snapshots */}
      <Card className="border-2 hover:border-green-400/30 hover:shadow-md transition-all duration-200">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
              <Database className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <CardTitle className="text-base">Incremental Auto-Saves</CardTitle>
              <CardDescription className="text-xs">Automatically captured after every data change (last 5)</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {autoSnapshots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No auto-saves yet. They appear after you add or edit data.
            </div>
          ) : (
            <div className="space-y-2">
              {autoSnapshots.map((snap, i) => (
                <div
                  key={snap.savedAt}
                  className="flex items-center justify-between px-4 py-3 rounded-lg border bg-card hover:bg-muted/40 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${i === 0 ? "bg-green-500" : "bg-slate-300"}`} />
                    <div>
                      <div className="text-sm font-medium">{snap.label}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(snap.savedAt).toLocaleString("en-GB")}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs"
                      onClick={() => {
                        downloadJson(snap.data, `auto-backup-${new Date(snap.savedAt).toISOString().split("T")[0]}.json`);
                        toast({ title: "Downloaded auto-save" });
                      }}
                    >
                      <Download className="w-3 h-3" /> Save
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-1.5 text-xs text-orange-700 border-orange-300 hover:bg-orange-50"
                      onClick={() => restoreSnapshot(snap)}
                    >
                      <RefreshCw className="w-3 h-3" /> Restore
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={confirmImport} onOpenChange={setConfirmImport}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore this backup?</AlertDialogTitle>
            <AlertDialogDescription>
              All current members, payments, and expenses will be <strong>permanently replaced</strong> with the contents of the selected backup. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingFile(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-orange-600 text-white hover:bg-orange-700"
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? "Restoring..." : "Yes, Restore"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function downloadJson(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
