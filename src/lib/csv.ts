export function columnsToCsv(columns: Record<string, number[]>): string {
  const names = Object.keys(columns);
  const n = Math.max(...names.map((k) => columns[k].length));
  const rows = [names.join(',')];
  for (let i = 0; i < n; i++) {
    rows.push(names.map((k) => (columns[k][i] != null ? String(columns[k][i]) : '')).join(','));
  }
  return rows.join('\n') + '\n';
}

export function downloadText(filename: string, text: string, mime = 'text/plain') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
