import * as XLSX from 'xlsx';

export interface ColumnConfig {
  key: string;
  header: string;
  format?: 'currency' | 'number' | 'percent' | 'date' | 'text';
  width?: number;
}

export interface ExportOptions {
  filename: string;
  title?: string;
  includeTimestamp?: boolean;
}

function formatValue(value: unknown, format?: ColumnConfig['format']): string | number {
  if (value === null || value === undefined) return '';

  switch (format) {
    case 'currency':
      return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
    case 'number':
      return typeof value === 'number' ? value : parseFloat(String(value)) || 0;
    case 'percent': {
      const pct = typeof value === 'number' ? value : parseFloat(String(value)) || 0;
      return `${(pct * 100).toFixed(1)}%`;
    }
    case 'date':
      if (!value) return '';
      return new Date(String(value)).toLocaleDateString();
    default:
      return String(value);
  }
}

export function generateFilename(base: string, extension: string, includeTimestamp = true): string {
  const clean = base.replace(/[^a-zA-Z0-9-_]/g, '_');
  const timestamp = includeTimestamp ? `_${new Date().toISOString().split('T')[0]}` : '';
  return `${clean}${timestamp}.${extension}`;
}

export function exportToCSV(
  data: Record<string, unknown>[],
  columns: ColumnConfig[],
  options: ExportOptions
): void {
  if (!data.length) {
    alert('No data to export');
    return;
  }

  const headers = columns.map(col => col.header);

  const rows = data.map(row =>
    columns.map(col => {
      const value = row[col.key];
      const formatted = formatValue(value, col.format);
      const str = String(formatted);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    })
  );

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = generateFilename(options.filename, 'csv', options.includeTimestamp);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportToExcel(
  data: Record<string, unknown>[],
  columns: ColumnConfig[],
  options: ExportOptions & { sheetName?: string }
): void {
  if (!data.length) {
    alert('No data to export');
    return;
  }

  const headers = columns.map(col => col.header);
  const rows = data.map(row =>
    columns.map(col => formatValue(row[col.key], col.format))
  );

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = columns.map(col => ({ wch: col.width || 15 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, options.sheetName || 'Data');

  XLSX.writeFile(wb, generateFilename(options.filename, 'xlsx', options.includeTimestamp));
}

export async function exportToPDF(
  element: HTMLElement,
  options: ExportOptions
): Promise<void> {
  try {
    const html2canvas = (await import('html2canvas')).default;
    const { jsPDF } = await import('jspdf');

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(generateFilename(options.filename, 'pdf', options.includeTimestamp));
  } catch (error) {
    console.error('PDF export failed:', error);
    alert('Failed to export PDF. Please try again.');
  }
}

export async function exportTableToPDF(
  data: Record<string, unknown>[],
  columns: ColumnConfig[],
  options: ExportOptions & { title?: string }
): Promise<void> {
  try {
    const { jsPDF } = await import('jspdf');
    const autoTable = (await import('jspdf-autotable')).default;

    const doc = new jsPDF();

    if (options.title) {
      doc.setFontSize(16);
      doc.text(options.title, 14, 20);
    }

    const headers = columns.map(col => col.header);
    const rows = data.map(row =>
      columns.map(col => String(formatValue(row[col.key], col.format)))
    );

    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: options.title ? 30 : 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] }
    });

    doc.save(generateFilename(options.filename, 'pdf', options.includeTimestamp));
  } catch (error) {
    console.error('PDF export failed:', error);
    alert('Failed to export PDF. Please try again.');
  }
}
