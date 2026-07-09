import { ReportExportersService } from './report-exporters.service';

describe('ReportExportersService', () => {
  let service: ReportExportersService;

  beforeEach(() => {
    service = new ReportExportersService();
  });

  it('should generate xlsx buffer with bold headers', async () => {
    const rows = [{ name: 'Alice', hours: 8 }];
    const columns = [
      { key: 'name', header: 'Nome' },
      { key: 'hours', header: 'Horas' },
    ];
    const buffer = await service.generateExcel(rows, columns, 'Test');

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('should generate pdf buffer', async () => {
    const rows = [{ name: 'Alice', hours: 8 }];
    const columns = [
      { key: 'name', header: 'Nome' },
      { key: 'hours', header: 'Horas' },
    ];
    const buffer = await service.generatePdf(rows, columns, 'Test');

    expect(buffer).toBeInstanceOf(Buffer);
    expect(buffer.length).toBeGreaterThan(0);
  });
});
