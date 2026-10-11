import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import ExcelJS from 'exceljs';

const app = express();
const port = process.env.PORT || 3001;
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json({ limit: '1mb' }));
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/exports/inventory/csv', (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length > 10000) return res.status(400).json({ error: 'Send an inventory list with up to 10,000 components.' });
  const fields = ['Component name', 'SKU / part number', 'Category', 'Current stock', 'Unit'];
  const quote = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
  const rows = items.map(item => {
    const quantity = Math.max(0, Number(item.stock) || 0);
    return [item.name, item.sku, item.category || 'Microcontrollers & Boards', quantity, item.unit || 'pcs'].map(quote).join(',');
  });
  const csv = '\uFEFF' + [fields.map(quote).join(','), ...rows].join('\r\n');
  res.status(200).set({ 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="benchspace-inventory.csv"' }).send(csv);
});

app.post('/api/exports/inventory', async (req, res) => {
  const items = req.body?.items;
  if (!Array.isArray(items) || items.length > 10000) {
    return res.status(400).json({ error: 'Send an inventory list with up to 10,000 components.' });
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Benchspace';
  workbook.subject = 'Tinkerspace component inventory';
  workbook.title = 'Benchspace Inventory';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Inventory', {
    views: [{ state: 'frozen', ySplit: 5, activeCell: 'A6' }],
    pageSetup: { paperSize: 9, orientation: 'landscape', fitToPage: true, fitToWidth: 1, fitToHeight: 0 }
  });
  sheet.columns = [
    { key: 'name', width: 34 },
    { key: 'sku', width: 23 },
    { key: 'category', width: 24 },
    { key: 'quantity', width: 16 },
    { key: 'unit', width: 12 },

  ];

  sheet.mergeCells('A1:E1');
  const title = sheet.getCell('A1');
  title.value = 'BENCHSPACE  /  COMPONENT INVENTORY';
  title.font = { name: 'Aptos Display', size: 19, bold: true, color: { argb: 'FFFFFFFF' } };
  title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF285346' } };
  title.alignment = { vertical: 'middle', indent: 1 };
  sheet.getRow(1).height = 38;
  sheet.mergeCells('A2:E2');
  const subtitle = sheet.getCell('A2');
  subtitle.value = `Tinkerspace community workshop  ·  Exported ${new Date().toLocaleString()}`;
  subtitle.font = { name: 'Aptos', size: 10, color: { argb: 'FF5E7066' }, italic: true };
  subtitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0E8' } };
  subtitle.alignment = { vertical: 'middle', indent: 2 };
  sheet.getRow(2).height = 25;

  const pieceCount = items.reduce((sum, item) => sum + (Number(item.stock) || 0), 0);
  const summary = [
    ['A3:B3', `COMPONENTS   ·   ${items.length}`],
    ['C3:E3', `PIECES ON HAND   ·   ${pieceCount}`]
  ];
  for (const [range, value] of summary) {
    sheet.mergeCells(range);
    const cell = sheet.getCell(range.split(':')[0]);
    cell.value = value;
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: 'FF38594B' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF4F1E8' } };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  }
  sheet.getRow(3).height = 28;
  sheet.getRow(4).height = 10;

  const headers = ['Component name', 'SKU / part number', 'Category', 'Current stock', 'Unit'];
  const header = sheet.getRow(5);
  header.values = headers;
  header.height = 34;
  header.eachCell(cell => {
    cell.font = { name: 'Aptos', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF426F5D' } };
    cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
    cell.border = { bottom: { style: 'medium', color: { argb: 'FFE9BE62' } } };
  });

  for (const item of items) {
    const quantity = Math.max(0, Number(item.stock) || 0);
    const row = sheet.addRow({
      name: item.name || '',
      sku: item.sku || '',
      category: item.category || 'Microcontrollers & Boards',
      quantity,
      unit: item.unit || 'pcs'
    });
    row.height = 31;
    row.eachCell((cell, columnNumber) => {
      cell.font = { name: 'Aptos', size: 10, color: { argb: 'FF37443B' }, ...(columnNumber === 1 ? { bold: true } : {}) };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: row.number % 2 === 0 ? 'FFF7F8F2' : 'FFFFFFFF' } };
      cell.alignment = { vertical: 'middle', horizontal: columnNumber === 4 ? 'center' : 'left', wrapText: true };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE6EAE2' } } };
    });
  }
  sheet.autoFilter = { from: 'A5', to: `E${Math.max(5, sheet.rowCount)}` };
  sheet.getColumn(4).numFmt = '#,##0';
  res.status(200).set({
    'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'Content-Disposition': 'attachment; filename="benchspace-inventory.xlsx"'
  });
  await workbook.xlsx.write(res);
  res.end();
});

app.listen(port, () => console.log(`Benchspace API listening on http://localhost:${port}`));
