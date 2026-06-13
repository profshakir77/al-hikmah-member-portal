import { useCallback } from "react";

const AUTO_BACKUP_KEY = "memberportal_auto_backup";
const MAX_SNAPSHOTS = 5;

export interface BackupSnapshot {
  savedAt: string;
  label: string;
  data: unknown;
}

export function getAutoBackups(): BackupSnapshot[] {
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_KEY);
    return raw ? (JSON.parse(raw) as BackupSnapshot[]) : [];
  } catch {
    return [];
  }
}

export function useAutoBackup() {
  const save = useCallback(async (label: string) => {
    try {
      const res = await fetch("/api/backup/export");
      if (!res.ok) return;
      const data = await res.json();

      const snapshots = getAutoBackups();
      const newSnapshot: BackupSnapshot = {
        savedAt: new Date().toISOString(),
        label,
        data,
      };

      const updated = [newSnapshot, ...snapshots].slice(0, MAX_SNAPSHOTS);
      localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(updated));

      window.dispatchEvent(new CustomEvent("autobackup", { detail: newSnapshot }));
    } catch {
      // silent — never interrupt the user workflow
    }
  }, []);

  return { save };
}
