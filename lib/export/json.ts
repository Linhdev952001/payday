import { downloadFile } from "./csv";

export function exportJsonBackup(data: unknown, filename = "payday-backup.json") {
  const content = JSON.stringify(data, null, 2);
  downloadFile(content, filename, "application/json");
}

export async function importJsonBackup(file: File): Promise<unknown> {
  const text = await file.text();
  return JSON.parse(text) as unknown;
}
