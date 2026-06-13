import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PdfHeader {
  orgName: string;
  title: string;
  subtitle: string;
  printedAt: string;
}

function drawHeader(doc: jsPDF, h: PdfHeader) {
  const pageW = doc.internal.pageSize.getWidth();

  // Navy banner
  doc.setFillColor(26, 42, 84);
  doc.rect(0, 0, pageW, 30, "F");

  // Org name
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(h.orgName, 14, 12);

  // Report title
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(h.title, 14, 20);

  // Period (right-aligned)
  doc.setFontSize(9);
  doc.text(h.subtitle, pageW - 14, 20, { align: "right" });

  // Timestamp bar
  doc.setFillColor(240, 243, 255);
  doc.rect(0, 30, pageW, 8, "F");
  doc.setTextColor(80, 90, 120);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(`Generated: ${h.printedAt}`, 14, 35.5);

  // Reset
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
}

function drawSectionTitle(doc: jsPDF, title: string, y: number): number {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(26, 42, 84);
  doc.text(title, 14, y);
  doc.setDrawColor(26, 42, 84);
  doc.setLineWidth(0.4);
  const pageW = doc.internal.pageSize.getWidth();
  doc.line(14, y + 1.5, pageW - 14, y + 1.5);
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  return y + 6;
}

function drawStatGrid(
  doc: jsPDF,
  stats: { label: string; value: string; highlight?: boolean }[],
  startY: number
): number {
  const pageW = doc.internal.pageSize.getWidth();
  const colW = (pageW - 28) / stats.length;
  const h = 16;

  stats.forEach((s, i) => {
    const x = 14 + i * colW;
    doc.setFillColor(s.highlight ? 219 : 248, s.highlight ? 234 : 250, s.highlight ? 219 : 252);
    doc.setDrawColor(210, 215, 230);
    doc.roundedRect(x, startY, colW - 2, h, 1.5, 1.5, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text(s.value, x + (colW - 2) / 2, startY + 7, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(100, 110, 130);
    doc.text(s.label, x + (colW - 2) / 2, startY + 13, { align: "center" });
  });

  doc.setTextColor(30, 30, 30);
  return startY + h + 4;
}

export function printedAt(): string {
  return new Date().toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export function generateMonthlyPdf(opts: {
  orgName: string;
  month: string;
  year: number;
  stats: { totalMembers: number; paid: number; unpaid: number; totalCollected: number; expectedTotal: number; totalExpenses: number; net: number; collectionRate: number };
  rows: { regNo: string; name: string; status: string; amount: string; date: string }[];
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ts = printedAt();

  drawHeader(doc, {
    orgName: opts.orgName,
    title: "Monthly Payment Report",
    subtitle: `${opts.month} ${opts.year}`,
    printedAt: ts,
  });

  let y = 46;
  y = drawSectionTitle(doc, "Summary", y);
  y = drawStatGrid(doc, [
    { label: "Total Members", value: String(opts.stats.totalMembers) },
    { label: "Paid", value: String(opts.stats.paid), highlight: true },
    { label: "Unpaid", value: String(opts.stats.unpaid) },
    { label: "Collected", value: opts.stats.totalCollected.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) },
    { label: "Expenses", value: opts.stats.totalExpenses.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) },
    { label: "Net", value: opts.stats.net.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) },
  ], y);

  // Collection rate bar
  const pageW = doc.internal.pageSize.getWidth();
  const barW = pageW - 28;
  const filled = (opts.stats.collectionRate / 100) * barW;
  doc.setFillColor(220, 230, 245);
  doc.roundedRect(14, y, barW, 5, 1, 1, "F");
  doc.setFillColor(37, 99, 235);
  if (filled > 0) doc.roundedRect(14, y, Math.min(filled, barW), 5, 1, 1, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(60, 80, 140);
  doc.text(`Collection Rate: ${opts.stats.collectionRate.toFixed(1)}%  |  Expected: ${opts.stats.expectedTotal.toLocaleString("de-DE", { style: "currency", currency: "EUR" })}`, 14, y + 9.5);
  y += 14;

  y = drawSectionTitle(doc, "Member Details", y);

  autoTable(doc, {
    startY: y,
    head: [["Reg No.", "Name", "Status", "Amount", "Paid On"]],
    body: opts.rows.map((r) => [r.regNo, r.name, r.status, r.amount, r.date]),
    theme: "grid",
    headStyles: { fillColor: [26, 42, 84], textColor: 255, fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 255] },
    columnStyles: {
      0: { cellWidth: 28, font: "courier" },
      2: { cellWidth: 20 },
      3: { cellWidth: 22 },
      4: { cellWidth: 26 },
    },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 2) {
        data.cell.styles.textColor = data.cell.raw === "Paid" ? [21, 128, 61] : [185, 28, 28];
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: 14, right: 14 },
  });

  addFooter(doc, ts);
  doc.save(`report-${opts.month.toLowerCase()}-${opts.year}.pdf`);
}

export function generateYearlyPdf(opts: {
  orgName: string;
  year: number;
  totals: { totalCollected: number; totalExpected: number; totalExpenses: number; net: number };
  rows: { month: string; paid: number; unpaid: number; collected: string; expenses: string; net: string; isPositive: boolean }[];
}) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ts = printedAt();

  drawHeader(doc, {
    orgName: opts.orgName,
    title: "Yearly Financial Report",
    subtitle: String(opts.year),
    printedAt: ts,
  });

  let y = 46;
  y = drawSectionTitle(doc, "Annual Summary", y);
  y = drawStatGrid(doc, [
    { label: "Total Collected", value: opts.totals.totalCollected.toLocaleString("de-DE", { style: "currency", currency: "EUR" }), highlight: true },
    { label: "Total Expected", value: opts.totals.totalExpected.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) },
    { label: "Total Expenses", value: opts.totals.totalExpenses.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) },
    { label: "Net", value: opts.totals.net.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) },
  ], y);

  y = drawSectionTitle(doc, "Monthly Breakdown", y);

  autoTable(doc, {
    startY: y,
    head: [["Month", "Paid", "Unpaid", "Collected", "Expenses", "Net"]],
    body: opts.rows.map((r) => [r.month, r.paid, r.unpaid, r.collected, r.expenses, r.net]),
    theme: "grid",
    headStyles: { fillColor: [26, 42, 84], textColor: 255, fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 255] },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 5) {
        const isPos = opts.rows[data.row.index]?.isPositive ?? true;
        data.cell.styles.textColor = isPos ? [21, 128, 61] : [185, 28, 28];
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: 14, right: 14 },
  });

  addFooter(doc, ts);
  doc.save(`report-yearly-${opts.year}.pdf`);
}

function addFooter(doc: jsPDF, ts: string) {
  const pageCount = doc.getNumberOfPages();
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFillColor(240, 243, 255);
    doc.rect(0, pageH - 8, pageW, 8, "F");
    doc.setFontSize(7);
    doc.setTextColor(120, 130, 150);
    doc.text(`Al-Hikmah Community Center  |  ${ts}`, 14, pageH - 3.5);
    doc.text(`Page ${i} of ${pageCount}`, pageW - 14, pageH - 3.5, { align: "right" });
  }
}
