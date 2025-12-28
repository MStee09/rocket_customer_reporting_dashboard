import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { FileType } from '../types/knowledgeBase';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const textParts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    textParts.push(pageText);
  }

  return textParts.join('\n\n');
}

async function extractTextFromDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

async function extractTextFromPlainText(file: File): Promise<string> {
  return await file.text();
}

async function extractTextFromCsv(file: File): Promise<string> {
  const text = await file.text();
  const lines = text.split('\n').filter((line) => line.trim());

  if (lines.length === 0) {
    return '';
  }

  const headers = parseCSVLine(lines[0]);
  const rows = lines.slice(1).map((line) => parseCSVLine(line));

  const formattedParts: string[] = [];
  formattedParts.push(`Headers: ${headers.join(', ')}`);
  formattedParts.push('');

  rows.forEach((row, index) => {
    const rowData = headers
      .map((header, i) => `${header}: ${row[i] || ''}`)
      .join(', ');
    formattedParts.push(`Row ${index + 1}: ${rowData}`);
  });

  return formattedParts.join('\n');
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      current += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function getFileType(file: File): FileType | null {
  const extension = file.name.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return 'pdf';
    case 'docx':
      return 'docx';
    case 'txt':
      return 'txt';
    case 'md':
      return 'md';
    case 'csv':
      return 'csv';
    default:
      return null;
  }
}

export async function extractTextFromFile(file: File): Promise<string> {
  const fileType = getFileType(file);

  if (!fileType) {
    throw new Error(`Unsupported file type: ${file.name}`);
  }

  switch (fileType) {
    case 'pdf':
      return extractTextFromPdf(file);
    case 'docx':
      return extractTextFromDocx(file);
    case 'txt':
    case 'md':
      return extractTextFromPlainText(file);
    case 'csv':
      return extractTextFromCsv(file);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

export function countWords(text: string): number {
  if (!text || !text.trim()) {
    return 0;
  }

  return text
    .trim()
    .split(/\s+/)
    .filter((word) => word.length > 0).length;
}

export function detectFileType(file: File): FileType | null {
  return getFileType(file);
}
