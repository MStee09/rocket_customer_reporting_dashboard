function serializeValueForCSV(value: any): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toLocaleDateString();
  }

  if (Array.isArray(value)) {
    return value.map(v => serializeValueForCSV(v)).join(', ');
  }

  if (typeof value === 'object') {
    return value.mode_name
      || value.status_name
      || value.equipment_name
      || value.carrier_name
      || value.company_name
      || value.name
      || value.description
      || value.label
      || JSON.stringify(value);
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return String(value);
}

export function exportToCSV(data: any[], filename: string, columns: { key: string; header: string }[]) {
  const headers = columns.map((col) => col.header).join(',');

  const rows = data.map((row) => {
    return columns
      .map((col) => {
        let value = serializeValueForCSV(row[col.key]);

        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          value = `"${value.replace(/"/g, '""')}"`;
        }

        return value;
      })
      .join(',');
  });

  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
