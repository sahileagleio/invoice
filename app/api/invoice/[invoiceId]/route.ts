
import prisma from "@/app/utils/db";
import { NextResponse } from "next/server";
import puppeteer from "puppeteer";
import { formatCurrency } from "@/app/utils/formatCurrency";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ invoiceId: string }>;
  }
) {
  const { invoiceId } = await params;

  const data = await prisma.invoice.findUnique({
    where: {
      id: invoiceId,
    },
    select: {
      invoiceName: true,
      invoiceNumber: true,
      currency: true,
      fromName: true,
      fromEmail: true,
      fromAddress: true,
      clientName: true,
      clientAddress: true,
      clientEmail: true,
      date: true,
      dueDate: true,
      invoiceItemDescription: true,
      invoiceItemQuantity: true,
      invoiceItemRate: true,
      total: true,
      note: true,
    },
  });

  if (!data) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }
  const html = await renderInvoiceHTML(data);

  //return pdf as download
  const pdfBuffer = await generatePDF(html);

  return new NextResponse(pdfBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=invoice-${data.clientName}.pdf`,
    },
  });
}

export async function generatePDF(
  pages: string,
  pageoptions?: any,
) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const width = 2480; // 210 mm at 300 DPI
  const height = 3508; // 297 mm at 300 DPI
  await page.setViewport({ width, height });
  await page.setContent(pages, { waitUntil: "networkidle0" });
  const pagees = await page.pdf(
    pageoptions ? pageoptions : getContentWithoutFooterOptionPDF()
  );
  await browser.close();
  return pagees;
}

export function getContentWithoutFooterOptionPDF() {
  return {
    format: "A4",
    scale: 1,
    printBackground: true,
    displayHeaderFooter: false,
    margin: { top: "32px", left: "32px", right: "32px", bottom: "56px" },
  };
}


async function renderInvoiceHTML(data: any) {
  return `
  <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; }
          h1 { font-size: 24px; }
          p { font-size: 14px; }
          .invoice-details { margin-bottom: 20px; }
          .invoice-items { width: 100%; border-collapse: collapse; }
          .invoice-items th, .invoice-items td { border: 1px solid #000; padding: 8px; }
        </style>
      </head>
      <body>
        <h1>${data.invoiceName}</h1>
        <div class="invoice-details">
          <p>Invoice Number: #${data.invoiceNumber}</p>
          <p>Date: ${new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(data.date)}</p>
          <p>Due Date: ${new Intl.DateTimeFormat("en-US", { dateStyle: "long" }).format(data.dueDate)}</p>
          <p>From: ${data.fromName}, ${data.fromEmail}, ${data.fromAddress}</p>
          <p>Bill To: ${data.clientName}, ${data.clientEmail}, ${data.clientAddress}</p>
        </div>
        <table class="invoice-items">
          <thead>
            <tr>
              <th>Description</th>
              <th>Quantity</th>
              <th>Rate</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>${data.invoiceItemDescription}</td>
              <td>${data.invoiceItemQuantity}</td>
              <td>${formatCurrency({ amount: data.invoiceItemRate, currency: data.currency })}</td>
              <td>${formatCurrency({ amount: data.total, currency: data.currency })}</td>
            </tr>
          </tbody>
        </table>
        <p>Note: ${data.note || 'N/A'}</p>
      </body>
    </html>
    `
  
}
