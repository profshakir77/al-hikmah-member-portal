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

export function generateTaxPdf(opts: {
  report: {
    orgName: string;
    totalIncome: number;
    totalExpenses: number;
    grossSurplus: number;
    activeMembers: number;
    totalMembers: number;
    quarters: { quarter: number; label: string; income: number; expenses: number; net: number }[];
    incomeByMonth: { month: number; collected: number; paymentCount: number }[];
    expensesByCategory: { category: string; total: number; count: number }[];
  };
  year: number;
}) {
  const { report, year } = opts;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ts = printedAt();

  drawHeader(doc, {
    orgName: report.orgName,
    title: "Annual Tax Report",
    subtitle: `Tax Year ${year}`,
    printedAt: ts,
  });

  let y = 46;

  // Org info bar
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(240, 243, 255);
  doc.rect(14, y, pageW - 28, 10, "F");
  doc.setFontSize(8);
  doc.setTextColor(80, 90, 130);
  doc.text(`${report.orgName}  |  Tax Year: ${year}  |  Active Members: ${report.activeMembers}  |  Total Members: ${report.totalMembers}`, pageW / 2, y + 6.5, { align: "center" });
  y += 14;

  // Summary
  y = drawSectionTitle(doc, "Annual Financial Summary", y);
  y = drawStatGrid(doc, [
    { label: "Total Income", value: report.totalIncome.toLocaleString("de-DE", { style: "currency", currency: "EUR" }), highlight: true },
    { label: "Total Expenditure", value: report.totalExpenses.toLocaleString("de-DE", { style: "currency", currency: "EUR" }) },
    { label: report.grossSurplus >= 0 ? "Net Surplus" : "Net Deficit", value: Math.abs(report.grossSurplus).toLocaleString("de-DE", { style: "currency", currency: "EUR" }), highlight: report.grossSurplus >= 0 },
  ], y);

  // Quarterly table
  y = drawSectionTitle(doc, "Quarterly Breakdown", y);
  autoTable(doc, {
    startY: y,
    head: [["Quarter", "Income (€)", "Expenses (€)", "Net (€)"]],
    body: report.quarters.map((q) => [
      q.label,
      q.income.toLocaleString("de-DE", { minimumFractionDigits: 2 }),
      q.expenses.toLocaleString("de-DE", { minimumFractionDigits: 2 }),
      q.net.toLocaleString("de-DE", { minimumFractionDigits: 2 }),
    ]),
    theme: "grid",
    headStyles: { fillColor: [26, 42, 84], textColor: 255, fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 255] },
    didParseCell: (data) => {
      if (data.section === "body" && data.column.index === 3) {
        const net = report.quarters[data.row.index]?.net ?? 0;
        data.cell.styles.textColor = net >= 0 ? [21, 128, 61] : [185, 28, 28];
        data.cell.styles.fontStyle = "bold";
      }
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  // Monthly income
  y = drawSectionTitle(doc, "Monthly Income Breakdown", y);
  const activeMonths = report.incomeByMonth.filter((m) => m.collected > 0);
  autoTable(doc, {
    startY: y,
    head: [["Month", "Payment Count", "Amount Collected (€)"]],
    body: [
      ...report.incomeByMonth.map((m) => {
        const mNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
        return [mNames[m.month - 1] ?? String(m.month), m.paymentCount, m.collected.toLocaleString("de-DE", { minimumFractionDigits: 2 })];
      }),
      ["TOTAL", String(report.incomeByMonth.reduce((s, m) => s + m.paymentCount, 0)), report.totalIncome.toLocaleString("de-DE", { minimumFractionDigits: 2 })],
    ],
    theme: "grid",
    headStyles: { fillColor: [26, 42, 84], textColor: 255, fontSize: 8, fontStyle: "bold" },
    bodyStyles: { fontSize: 8 },
    alternateRowStyles: { fillColor: [248, 250, 255] },
    didParseCell: (data) => {
      if (data.section === "body" && data.row.index === 12) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [220, 242, 228];
      }
      if (data.section === "body" && data.column.index === 2 && data.row.index < 12) {
        const collected = report.incomeByMonth[data.row.index]?.collected ?? 0;
        if (collected === 0) data.cell.styles.textColor = [180, 180, 180];
        else data.cell.styles.textColor = [21, 128, 61];
      }
    },
    margin: { left: 14, right: 14 },
  });

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;

  if (y > 230) { doc.addPage(); y = 20; }

  // Expenses by category
  y = drawSectionTitle(doc, "Expenditure by Category", y);
  if (report.expensesByCategory.length === 0) {
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text("No expenses recorded for this tax year.", 14, y + 4);
    y += 10;
  } else {
    autoTable(doc, {
      startY: y,
      head: [["Category", "Count", "Amount (€)", "% of Total"]],
      body: [
        ...report.expensesByCategory.map((cat) => {
          const pct = report.totalExpenses > 0 ? ((cat.total / report.totalExpenses) * 100).toFixed(1) + "%" : "0%";
          return [cat.category, cat.count, cat.total.toLocaleString("de-DE", { minimumFractionDigits: 2 }), pct];
        }),
        ["TOTAL", String(report.expensesByCategory.reduce((s, c) => s + c.count, 0)), report.totalExpenses.toLocaleString("de-DE", { minimumFractionDigits: 2 }), "100%"],
      ],
      theme: "grid",
      headStyles: { fillColor: [26, 42, 84], textColor: 255, fontSize: 8, fontStyle: "bold" },
      bodyStyles: { fontSize: 8 },
      alternateRowStyles: { fillColor: [255, 250, 245] },
      didParseCell: (data) => {
        const lastRow = report.expensesByCategory.length;
        if (data.section === "body" && data.row.index === lastRow) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fillColor = [255, 237, 213];
        }
        if (data.section === "body" && data.column.index === 2 && data.row.index < lastRow) {
          data.cell.styles.textColor = [194, 65, 12];
        }
      },
      margin: { left: 14, right: 14 },
    });

    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  }

  addFooter(doc, ts);
  doc.save(`tax-report-${year}.pdf`);
}

// ── Members Report PDF ────────────────────────────────────────────────────────
interface MembersReportPdfOptions {
  orgName: string;
  year: number;
  totalMembers: number;
  activeMembers: number;
  totalCollected: number;
  collectionRate: number;
  members: {
    registrationNumber: string;
    name: string;
    phone: string;
    status: string;
    monthlyPayments: { month: number; paid: boolean; amount: number }[];
    totalPaidMonths: number;
    totalAmount: number;
  }[];
}

const SHORT_MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function generateMembersReportPdf(opts: MembersReportPdfOptions) {
  const { orgName, year, totalMembers, activeMembers, totalCollected, collectionRate, members } = opts;
  const ts = printedAt();
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth(); // 297

  // Header banner (landscape)
  doc.setFillColor(26, 42, 84);
  doc.rect(0, 0, pageW, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(orgName, 14, 12);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Member Payment Report", 14, 20);
  doc.setFontSize(9);
  doc.text(`Year: ${year}`, pageW - 14, 20, { align: "right" });

  // Timestamp bar
  doc.setFillColor(240, 243, 255);
  doc.rect(0, 30, pageW, 8, "F");
  doc.setTextColor(80, 90, 120);
  doc.setFontSize(8);
  doc.setFont("helvetica", "italic");
  doc.text(`Generated: ${ts}`, 14, 35.5);

  // Summary row
  doc.setFont("helvetica", "normal");
  doc.setTextColor(30, 30, 30);
  doc.setFontSize(9);
  const summaryY = 46;
  const items = [
    { label: "Total Members", value: String(totalMembers) },
    { label: "Active Members", value: String(activeMembers) },
    { label: "Total Collected", value: `€${totalCollected.toFixed(2)}` },
    { label: "Collection Rate", value: `${collectionRate}%` },
  ];
  items.forEach((item, i) => {
    const x = 14 + i * 68;
    doc.setFillColor(247, 249, 255);
    doc.roundedRect(x, summaryY - 5, 62, 12, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(26, 42, 84);
    doc.text(item.value, x + 31, summaryY + 1, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 110, 130);
    doc.setFontSize(7);
    doc.text(item.label, x + 31, summaryY + 5.5, { align: "center" });
    doc.setFontSize(9);
  });

  // Table — each member row shows 12 month cells + summary
  const head = [["#", "Reg No.", "Name", "Phone", "Status", ...SHORT_MONTHS, "Paid", "Total (€)"]];
  const body = members.map((m, idx) => {
    const monthCells = m.monthlyPayments.map((mp) =>
      mp.paid ? `€${mp.amount.toFixed(0)}` : "-"
    );
    return [
      String(idx + 1),
      m.registrationNumber,
      m.name,
      m.phone,
      m.status === "active" ? "Active" : "Inactive",
      ...monthCells,
      `${m.totalPaidMonths}/12`,
      `€${m.totalAmount.toFixed(2)}`,
    ];
  });

  autoTable(doc, {
    startY: summaryY + 12,
    head,
    body,
    theme: "grid",
    headStyles: { fillColor: [26, 42, 84], textColor: 255, fontSize: 6.5, fontStyle: "bold", halign: "center" },
    bodyStyles: { fontSize: 6.5, halign: "center" },
    columnStyles: {
      0: { cellWidth: 7 },
      1: { cellWidth: 18 },
      2: { cellWidth: 28, halign: "left" },
      3: { cellWidth: 22, halign: "left" },
      4: { cellWidth: 14 },
      17: { cellWidth: 12 },
      18: { cellWidth: 16 },
    },
    didParseCell: (data) => {
      if (data.section === "body") {
        const val = String(data.cell.raw);
        if (val.startsWith("€") && data.column.index >= 5 && data.column.index <= 16) {
          data.cell.styles.fillColor = [220, 252, 231];
          data.cell.styles.textColor = [21, 128, 61];
        } else if (val === "-" && data.column.index >= 5 && data.column.index <= 16) {
          data.cell.styles.fillColor = [255, 241, 242];
          data.cell.styles.textColor = [185, 28, 28];
        }
        if (data.column.index === 4) {
          if (val === "Inactive") {
            data.cell.styles.textColor = [185, 28, 28];
          } else {
            data.cell.styles.textColor = [21, 128, 61];
          }
        }
      }
    },
    margin: { left: 5, right: 5 },
  });

  addFooter(doc, ts);
  doc.save(`member-report-${year}.pdf`);
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
