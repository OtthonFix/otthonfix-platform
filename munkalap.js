// =============================
// services/workOrderService.js
// =============================
// Egyszerű, függőségbarát PDF generálás PDFKit-tel. Nem igényel Chrome-ot vagy külső binárist.

const fs = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

function ensureDirSync(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function huf(n) {
  try {
    return new Intl.NumberFormat('hu-HU', { style: 'currency', currency: 'HUF', maximumFractionDigits: 0 }).format(n || 0);
  } catch {
    return `${Math.round(n || 0)} Ft`;
  }
}

function drawHeader(doc, { title = 'Munkalap', logoPath, company }) {
  if (logoPath && fs.existsSync(logoPath)) {
    doc.image(logoPath, 40, 40, { width: 80 });
  }
  doc
    .fontSize(22)
    .text(title, 140, 45)
    .fontSize(10)
    .text(company?.name || 'Vállalkozás neve', 140, 75)
    .text(company?.address || 'Cím', 140, 90)
    .text(company?.email || 'email@vallalat.hu', 140, 105)
    .text(company?.phone || '+36 30 000 0000', 140, 120);

  doc.moveTo(40, 140).lineTo(555, 140).stroke();
}

function drawKeyValues(doc, x, y, rows) {
  const keyWidth = 120;
  const valueWidth = 180;
  const lineHeight = 16;
  let cy = y;
  rows.forEach(([k, v]) => {
    doc.font('Helvetica-Bold').text(k, x, cy, { width: keyWidth });
    doc.font('Helvetica').text(v || '-', x + keyWidth + 10, cy, { width: valueWidth });
    cy += lineHeight;
  });
  return cy;
}

function drawTable(doc, { x = 40, y = 310, columns, rows }) {
  const colWidths = columns.map(c => c.width);
  const totalWidth = colWidths.reduce((a,b)=>a+b, 0);
  // Header
  doc.rect(x, y, totalWidth, 22).fill('#efefef');
  doc.fillColor('#000');
  let cx = x; 
  columns.forEach(col => {
    doc.font('Helvetica-Bold').fontSize(9).text(col.header, cx + 4, y + 6, { width: col.width - 8 });
    cx += col.width;
  });
  doc.moveTo(x, y + 22).lineTo(x + totalWidth, y + 22).stroke();

  // Rows
  let cy = y + 26;
  rows.forEach((r, idx) => {
    cx = x;
    columns.forEach((col, i) => {
      const val = (typeof col.accessor === 'function') ? col.accessor(r) : r[col.accessor];
      doc.font('Helvetica').fontSize(9).text(val != null ? String(val) : '', cx + 4, cy, { width: col.width - 8 });
      cx += col.width;
    });
    cy += 18;
    doc.moveTo(x, cy).lineTo(x + totalWidth, cy).strokeColor('#ddd').stroke().strokeColor('#000');
  });

  return cy;
}

async function generateWorkOrder(order, customer, mechanic, opts = {}) {
  const {
    outputDir = path.join(process.cwd(), 'generated', 'workorders'),
    logoPath,
    company = {},
    vatRate = 0.27,
  } = opts;

  ensureDirSync(outputDir);
  const fileName = `munkalap-${order.id}.pdf`;
  const outPath = path.join(outputDir, fileName);

  const doc = new PDFDocument({ size: 'A4', margin: 40, info: { Title: `Munkalap #${order.id}` } });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  drawHeader(doc, { title: `Munkalap #${order.id}`, logoPath, company });

  const createdAt = order.createdAt ? new Date(order.createdAt) : new Date();
  const leftY = 160;
  const rightY = 160;

  doc.fontSize(12).font('Helvetica-Bold').text('Ügyfél', 40, leftY);
  drawKeyValues(doc, 40, leftY + 18, [
    ['Név', customer?.name],
    ['Cím', customer?.address],
    ['Email', customer?.email],
    ['Telefon', customer?.phone],
  ]);

  doc.fontSize(12).font('Helvetica-Bold').text('Szerelő', 320, rightY);
  drawKeyValues(doc, 320, rightY + 18, [
    ['Név', mechanic?.name],
    ['Azonosító', mechanic?.id],
    ['Email', mechanic?.email],
    ['Telefon', mechanic?.phone],
  ]);

  doc.moveDown(1);
  doc.fontSize(12).font('Helvetica-Bold').text('Munka adatai', 40, 260);
  drawKeyValues(doc, 40, 278, [
    ['Megrendelés ID', order.id],
    ['Dátum', createdAt.toLocaleString('hu-HU')],
    ['Kategória', order.category],
    ['Leírás', order.description],
    ['Helyszín', order.location?.address || '-'],
    ['Tervezett idő', order.scheduledAt ? new Date(order.scheduledAt).toLocaleString('hu-HU') : '-'],
    ['Távolság', mechanic?.distance != null ? `${mechanic.distance} km` : '-'],
  ]);

  // Tételek összeállítása
  const items = Array.isArray(order.items) && order.items.length
    ? order.items
    : [{ name: order.category || 'Szolgáltatás', qty: 1, unitPrice: order.price || 0, note: order.description }];

  const netTotal = items.reduce((s, it) => s + (it.qty * (it.unitPrice || 0)), 0);
  const vat = Math.round(netTotal * vatRate);
  const gross = netTotal + vat;

  const endY = drawTable(doc, {
    x: 40,
    y: 310,
    columns: [
      { header: 'Megnevezés', width: 210, accessor: r => r.name + (r.note ? ` — ${r.note}` : '') },
      { header: 'Menny.', width: 60, accessor: r => r.qty },
      { header: 'Egységár', width: 80, accessor: r => huf(r.unitPrice) },
      { header: 'Nettó', width: 80, accessor: r => huf(r.qty * (r.unitPrice || 0)) },
      { header: 'ÁFA %', width: 50, accessor: () => Math.round(vatRate * 100) + '%' },
      { header: 'Bruttó', width: 75, accessor: r => huf((r.qty * (r.unitPrice || 0)) * (1 + vatRate)) },
    ],
    rows: items,
  });

  // Összesítő
  const sumX = 330;
  let sumY = endY + 10;
  doc.font('Helvetica-Bold');
  doc.text('Összesítő', sumX, sumY);
  doc.font('Helvetica');
  sumY += 16;
  [
    ['Nettó összesen', huf(netTotal)],
    ['ÁFA', huf(vat)],
    ['Bruttó összesen', huf(gross)],
  ].forEach(([k, v]) => {
    doc.text(k, sumX, sumY, { width: 120 });
    doc.text(v, sumX + 140, sumY, { width: 120, align: 'right' });
    sumY += 16;
  });

  // Aláírások
  const signY = sumY + 40;
  doc.moveTo(60, signY).lineTo(240, signY).stroke();
  doc.moveTo(320, signY).lineTo(500, signY).stroke();
  doc.fontSize(9)
    .text('Ügyfél aláírása', 60, signY + 6, { width: 180, align: 'center' })
    .text('Szolgáltató/Szerelő aláírása', 320, signY + 6, { width: 180, align: 'center' });

  // Megjegyzés
  doc.moveDown(2);
  doc.fontSize(8).fillColor('#555').text(
    'A dokumentum automatikusan generálódott. Eltérés vagy kérdés esetén lépjen kapcsolatba ügyfélszolgálatunkkal.',
    40,
    signY + 40,
    { width: 515 }
  );

  doc.end();

  // Várjuk meg a fájl lezárását
  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  return { path: outPath, fileName };
}

module.exports = { generateWorkOrder };


// ======================================
// services/emailService.js (kiegészítés)
// ======================================
// A meglévő emailService-hez adj egy opcionális attachments paramétert.
// Példa a sendOrderConfirmation módosítására (Nodemailer esetén):
/*
async function sendOrderConfirmation(order, customer, options = {}) {
  const { attachments = [] } = options;
  await transporter.sendMail({
    to: customer.email,
    subject: `Rendelés visszaigazolás – ${order.id}`,
    text: `Köszönjük a megrendelést! Csatoltuk a munkalapot.`,
    attachments, // <-- itt adjuk át
  });
}
*/


// =============================
// server.js (részlet – integráció)
// =============================
// 1) Importáld felül:
// const { generateWorkOrder } = require('./services/workOrderService');

// 2) A match endpointban, miután az order-t elmented:
/*
app.post('/api/match', async (req, res) => {
  // ... meglévő kód ...
  database.orders.push(order);

  // Generáljunk munkalapot
  const customer = {
    id: 'customer-123',
    email: 'customer@example.com', // CSERÉLD VALÓDI EMAILRE
    name: 'Teszt Ügyfél',
    address: 'Budapest, V. kerület',
    phone: '+36 30 000 0000',
  };

  const mainMechanic = mechanics[0]; // első találat
  const { path: workOrderPath, fileName } = await generateWorkOrder(order, customer, mainMechanic, {
    company: { name: 'GyorsSzerelő Kft.', address: 'Budapest', email: 'info@gyorsszerelo.hu', phone: '+36 1 234 5678' },
    logoPath: path.join(process.cwd(), 'assets', 'logo.png'), // ha van logó
  });

  // Email: rendelés visszaigazolás + munkalap csatolása
  emailService.sendOrderConfirmation(order, customer, {
    attachments: [{ filename: fileName, path: workOrderPath }]
  }).catch(err => console.error('Email failed:', err));

  // Szerelők értesítése maradhat a korábbi módon (nem szükséges csatolni nekik a munkalapot)

  res.json({ success: true, mechanics: mechanics.slice(0, 3), orderId: order.id, workOrder: { fileName } });
});
*/

// 3) Letöltő végpont (opcionális):
/*
app.get('/api/orders/:id/munkalap.pdf', async (req, res) => {
  const orderId = req.params.id;
  const order = database.orders.find(o => o.id === orderId);
  if (!order) return res.status(404).json({ success: false, message: 'Rendelés nem található' });

  // Itt szükség esetén töltsd be a kapcsolódó ügyfelet/szerelőt az adatbázisból
  const customer = { name: 'Teszt Ügyfél', email: 'customer@example.com', address: 'Budapest, V. kerület', phone: '+36 30 000 0000' };
  const mechanic = { name: 'Teszt Szerelő', id: 'mech-1', email: 'mech@example.com', phone: '+36 70 000 0000' };

  const { path: workOrderPath } = await generateWorkOrder(order, customer, mechanic);
  res.download(workOrderPath, err => { if (err) console.error(err); });
});
*/
