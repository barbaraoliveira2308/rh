import { Injectable, Logger } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import * as PdfMake from 'pdfmake';
import * as PdfFonts from 'pdfmake/build/vfs_fonts';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

type Row = Record<string, unknown>;

interface PdfMakeStatic {
  addFonts: (fonts: Record<string, Record<string, string>>) => void;
  createPdf: (definition: Record<string, unknown>) => {
    getBuffer: (callback: (buffer: Buffer) => void) => void;
    write: (filename: string) => Promise<void>;
  };
}

const pdfMakeInstance = PdfMake as unknown as PdfMakeStatic;
const fontDir = path.join(os.tmpdir(), 'pdfmake-fonts');
let fontsInitialized = false;

function initializeFonts(): void {
  if (fontsInitialized) {
    return;
  }

  if (!fs.existsSync(fontDir)) {
    fs.mkdirSync(fontDir, { recursive: true });
  }

  const fontsModule = PdfFonts as unknown as Record<string, string>;

  for (const key of Object.keys(fontsModule)) {
    const fontPath = path.join(fontDir, key);

    if (!fs.existsSync(fontPath)) {
      fs.writeFileSync(fontPath, Buffer.from(fontsModule[key], 'base64'));
    }
  }

  pdfMakeInstance.addFonts({
    Roboto: {
      normal: path.join(fontDir, 'Roboto-Regular.ttf'),
      bold: path.join(fontDir, 'Roboto-Medium.ttf'),
      italics: path.join(fontDir, 'Roboto-Italic.ttf'),
      bolditalics: path.join(fontDir, 'Roboto-MediumItalic.ttf'),
    },
  });

  fontsInitialized = true;
}

@Injectable()
export class ReportExportersService {
  private readonly logger = new Logger(ReportExportersService.name);

  async generateExcel(
    rows: Row[],
    columns: { key: string; header: string; width?: number }[],
    sheetName = 'Relatório',
  ): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    worksheet.columns = columns.map((column) => ({
      key: column.key,
      header: column.header,
      width: column.width ?? 20,
    }));

    const headerRow = worksheet.getRow(1);

    for (let index = 1; index <= columns.length; index++) {
      const cell = headerRow.getCell(index);
      cell.font = { bold: true };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD3D3D3' },
      };
    }

    for (const row of rows) {
      const added = worksheet.addRow(
        columns.reduce<Record<string, unknown>>((record, column) => {
          record[column.key] = row[column.key] ?? '';
          return record;
        }, {}),
      );

      if (added.number % 2 === 0) {
        for (let index = 1; index <= columns.length; index++) {
          added.getCell(index).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFF0F0F0' },
          };
        }
      }
    }

    const buffer = await workbook.xlsx.writeBuffer();
    return Buffer.from(buffer);
  }

  async generatePdf(
    rows: Row[],
    columns: { key: string; header: string }[],
    title: string,
  ): Promise<Buffer> {
    initializeFonts();

    const headers = columns.map((column) => ({
      text: column.header,
      bold: true,
      fillColor: '#D3D3D3',
    }));

    const body: unknown[][] = [headers];

    for (let index = 0; index < rows.length; index++) {
      const row = rows[index];
      const fillColor = index % 2 === 1 ? '#F0F0F0' : null;
      const cells = columns.map((column) => ({
        text: this.formatCell(row[column.key]),
        fillColor,
      }));
      body.push(cells);
    }

    const definition: Record<string, unknown> = {
      content: [
        { text: title, style: 'header' },
        { text: 'Gerado em ' + new Date().toLocaleString('pt-PT'), margin: [0, 0, 0, 10] },
        {
          table: {
            headerRows: 1,
            widths: columns.map(() => '*'),
            body,
          },
        },
      ],
      styles: {
        header: {
          fontSize: 16,
          bold: true,
          margin: [0, 0, 0, 10],
        },
      },
      defaultStyle: {
        fontSize: 8,
        font: 'Roboto',
      },
    };

    const pdfDoc = pdfMakeInstance.createPdf(definition);
    const tmpFile = path.join(os.tmpdir(), 'report-' + String(Date.now()) + '.pdf');

    try {
      await pdfDoc.write(tmpFile);
      return fs.readFileSync(tmpFile);
    } catch (error) {
      this.logger.error(
        'Failed to generate PDF: ' + (error instanceof Error ? error.message : String(error)),
      );
      throw error;
    } finally {
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
    }
  }

  private formatCell(value: unknown): string {
    if (value === null || value === undefined) {
      return '';
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    if (value instanceof Date) {
      return value.toLocaleString('pt-PT');
    }

    return JSON.stringify(value);
  }
}
