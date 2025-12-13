import { useCallback } from 'react';
import type { Transaction, AppSettings, ExportedData } from '../types';

interface ImportResult {
  success: boolean;
  message: string;
  data?: ExportedData;
}

export function useDataExportImport() {
  /**
   * Export transactions and settings to JSON
   */
  const exportToJSON = useCallback((transactions: Transaction[], settings: AppSettings): string => {
    const exportData: ExportedData = {
      transactions,
      settings,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(exportData, null, 2);
  }, []);

  /**
   * Download JSON file to user's computer
   */
  const downloadJSON = useCallback((transactions: Transaction[], settings: AppSettings, filename = 'monera-data.json'): void => {
    const jsonData = exportToJSON(transactions, settings);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [exportToJSON]);

  /**
   * Import from JSON file
   */
  const importFromJSON = useCallback((jsonString: string): ImportResult => {
    try {
      const data = JSON.parse(jsonString) as ExportedData;

      // Validate structure
      if (!data.transactions || !Array.isArray(data.transactions)) {
        return {
          success: false,
          message: 'Invalid JSON: missing transactions array',
        };
      }

      // Validate transaction structure - less strict for imports
      const validTransactions = data.transactions.every(
        (t) => t.title && typeof t.amount === 'number' && t.category && t.date && t.type
      );

      if (!validTransactions) {
        return {
          success: false,
          message: 'Invalid JSON: transactions have invalid structure',
        };
      }

      return {
        success: true,
        message: 'JSON imported successfully',
        data,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }, []);

  /**
   * Import from CSV file
   */
  const importFromCSV = useCallback((csvString: string): ImportResult => {
    try {
      const lines = csvString.trim().split('\n');
      if (lines.length < 2) {
        return {
          success: false,
          message: 'CSV file is empty or invalid',
        };
      }

      // Parse header
      const headerLine = lines[0];
      const headers = parseCSVLine(headerLine);

      // Map headers to transaction fields
      const titleIdx = findHeaderIndex(headers, ['title', 'başlık']);
      const amountIdx = findHeaderIndex(headers, ['amount', 'tutar']);
      const categoryIdx = findHeaderIndex(headers, ['category', 'kategori']);
      const dateIdx = findHeaderIndex(headers, ['date', 'tarih']);
      const typeIdx = findHeaderIndex(headers, ['type', 'tür']);
      const descIdx = findHeaderIndex(headers, ['description', 'açıklama']);

      if (titleIdx === -1 || amountIdx === -1 || categoryIdx === -1 || dateIdx === -1 || typeIdx === -1) {
        return {
          success: false,
          message: 'CSV missing required columns: Title, Amount, Category, Date, Type',
        };
      }

      // Parse data rows
      const transactions: Transaction[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const cells = parseCSVLine(line);
        const transaction: Transaction = {
          id: generateUUID(),
          title: cells[titleIdx] || 'Untitled',
          amount: parseFloat(cells[amountIdx] || '0') || 0,
          category: cells[categoryIdx] || 'Other',
          date: cells[dateIdx] || new Date().toISOString().split('T')[0],
          type: (cells[typeIdx] || 'expense') as any,
          description: descIdx !== -1 ? cells[descIdx] : undefined,
          originalCurrency: 'TRY',
        };

        if (transaction.amount > 0) {
          transactions.push(transaction);
        }
      }

      if (transactions.length === 0) {
        return {
          success: false,
          message: 'No valid transactions found in CSV',
        };
      }

      return {
        success: true,
        message: `Imported ${transactions.length} transactions from CSV`,
        data: {
          transactions,
          settings: {} as AppSettings,
          exportedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to parse CSV: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }, []);

  /**
   * Export transactions to CSV format
   */
  const transactionsToCSV = useCallback((transactions: Transaction[]): string => {
    if (transactions.length === 0) return '';
    
    // Header row
    const headers = ['title', 'amount', 'category', 'date', 'type', 'description', 'originalCurrency'];
    const headerRow = headers.join(',');
    
    // Data rows
    const dataRows = transactions.map((t) => {
      return [
        `"${t.title.replace(/"/g, '""')}"`, // Escape quotes
        t.amount,
        t.category,
        t.date,
        t.type,
        t.description ? `"${t.description.replace(/"/g, '""')}"` : '',
        (t as any).originalCurrency || 'TRY',
      ].join(',');
    });
    
    return [headerRow, ...dataRows].join('\n');
  }, []);

  /**
   * Download CSV file to user's computer
   */
  const downloadCSV = useCallback((transactions: Transaction[], filename = 'monera-data.csv'): void => {
    const csvData = transactionsToCSV(transactions);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [transactionsToCSV]);

  return {
    exportToJSON,
    downloadJSON,
    downloadCSV,
    importFromJSON,
    importFromCSV,
  };
}

/**
 * Parse CSV line respecting quoted fields
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
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

/**
 * Find header index by multiple possible names
 */
function findHeaderIndex(headers: string[], possibleNames: string[]): number {
  const lowerHeaders = headers.map((h) => h.toLowerCase());
  for (const name of possibleNames) {
    const idx = lowerHeaders.indexOf(name.toLowerCase());
    if (idx !== -1) return idx;
  }
  return -1;
}

/**
 * Generate UUID v4
 */
function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
