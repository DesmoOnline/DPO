import { jsPDF } from "jspdf";
import { Order, CompanySettings } from "../types";

export const generateInvoicePDF = (order: Order, companySettings: CompanySettings): jsPDF => {
  const doc = new jsPDF();
  const isQuote = order.documentType === "QUOTE" || order.status === "quote_requested" || order.status === "quote_finalized";
  const safeText = (value: unknown, fallback = ""): string => {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text.length > 0 ? text : fallback;
  };
  const writeText = (value: unknown, x: number, y: number, fallback = "") => {
    const text = safeText(value, fallback);
    if (!text) return;
    doc.text(doc.splitTextToSize(text, 180), x, y);
  };
  const companyName = safeText(companySettings.companyName || companySettings.tradingName, "Desmo Products Wholesale");
  const companyAbn = safeText(companySettings.abn, "");
  const companyEmail = safeText(companySettings.email, "");
  const companyAddress = safeText(companySettings.address, "");
  const paymentTerms = safeText(companySettings.paymentTerms, "14 Days");
  const bankName = safeText(companySettings.bankName, "");
  const accountName = safeText(companySettings.accountName, "");
  const bsb = safeText(companySettings.bsb, "");
  const accountNo = safeText(companySettings.accountNo, "");
  const companyNote = safeText(companySettings.orderPendingMessage, "");
  
  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(isQuote ? "QUOTE" : "TAX INVOICE", 14, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  writeText(companyName, 14, 28, "Desmo Products Wholesale");
  writeText(companyAbn ? `ABN: ${companyAbn}` : "", 14, 33);
  writeText(companyEmail ? `Email: ${companyEmail}` : "", 14, 38);
  writeText(companyAddress, 14, 43);
  
  // Invoice details (Right aligned)
  doc.setFont("helvetica", "bold");
  doc.text(`${isQuote ? "Quote" : "Invoice"} No: ${order.id}`, 140, 20);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-AU')}`, 140, 25);
  doc.text(`Status: ${order.status.toUpperCase().replace('_', ' ')}`, 140, 30);
  
  if (companySettings.logoBase64) {
    try {
      doc.addImage(companySettings.logoBase64, 'PNG', 140, 35, 30, 15);
    } catch (e) {
      console.warn("Failed to attach base64 logo to PDF");
    }
  }
  
  // Line separator
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 45, 196, 45);
  
  // Bill To details
  doc.setFont("helvetica", "bold");
  doc.text("BILL TO:", 14, 53);
  doc.setFont("helvetica", "normal");
  writeText(order.companyName, 14, 58, "Customer");
  writeText(order.customerEmail, 14, 63);
  
  // Table Header
  let y = 75;
  doc.setFillColor(245, 245, 245);
  doc.rect(14, y, 182, 8, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Description", 16, y + 5.5);
  doc.text("SKU", 85, y + 5.5);
  doc.text("Qty", 120, y + 5.5);
  doc.text("Unit Price", 140, y + 5.5);
  doc.text("Total", 175, y + 5.5);
  
  // Table Rows
  doc.setFont("helvetica", "normal");
  y += 8;
  order.items.forEach(item => {
    const productName = safeText(item.productName, "Item");
    const desc = productName.length > 35 ? productName.substring(0, 35) + "..." : productName;
    doc.text(desc, 16, y + 5.5);
    writeText(item.sku, 85, y + 5.5);
    doc.text(item.qty.toString(), 120, y + 5.5);
    doc.text(`$${item.finalPricePerUnit.toFixed(2)}`, 140, y + 5.5);
    doc.text(`$${item.totalLineAmount.toFixed(2)}`, 175, y + 5.5);
    
    y += 8;
  });
  
  // Separator
  doc.line(14, y + 2, 196, y + 2);
  y += 8;
  
  // Totals (Right aligned)
  doc.setFont("helvetica", "bold");
  doc.text(`Subtotal (ex. GST):`, 130, y);
  doc.setFont("helvetica", "normal");
  doc.text(`$${order.subtotal.toFixed(2)}`, 175, y);
  
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text(`GST (10%):`, 130, y);
  doc.setFont("helvetica", "normal");
  doc.text(`$${order.gstAmount.toFixed(2)}`, 175, y);
  
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.text(`Total Amount (AUD):`, 130, y);
  doc.setFont("helvetica", "normal");
  doc.text(`$${order.totalAmount.toFixed(2)}`, 175, y);
  
  // Banking Details
  y += 15;
  doc.setFont("helvetica", "bold");
  doc.text("EFT Payment Details:", 14, y);
  
  doc.setFont("helvetica", "normal");
  y += 5;
  if (bankName) writeText(`Bank: ${bankName}`, 14, y);
  y += 5;
  if (accountName) writeText(`Account Name: ${accountName}`, 14, y);
  y += 5;
  if (bsb) writeText(`BSB: ${bsb}`, 14, y);
  y += 5;
  if (accountNo) writeText(`ACC: ${accountNo}`, 14, y);
  
  y += 10;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  writeText(`* PAYMENT REQUIRED WITHIN ${paymentTerms.toUpperCase()}. PLEASE EMAIL REMITTANCE ADVICE TO ${companyEmail.toUpperCase()}.`, 14, y);
  doc.setTextColor(0, 0, 0); // Reset color
  doc.setFontSize(10);
  
  if (order.notes) {
    y += 15;
    doc.setFont("helvetica", "bold");
    doc.text("Notes:", 14, y);
    doc.setFont("helvetica", "normal");
    writeText(order.notes, 14, y + 5);
  }
  
  return doc;
};

export const generatePackingSlipPDF = (order: Order): jsPDF => {
  const doc = new jsPDF();
  const safeText = (value: unknown, fallback = ""): string => {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text.length > 0 ? text : fallback;
  };
  
  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("PACKING SLIP", 14, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Desmo Products Online", 14, 28);
  doc.text("Perth, WA, Australia", 14, 33);
  
  // Details
  doc.setFont("helvetica", "bold");
  doc.text(`Order Ref: ${order.id}`, 140, 20);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date(order.createdAt).toLocaleDateString('en-AU')}`, 140, 25);
  
  // Line separator
  doc.setDrawColor(200, 200, 200);
  doc.line(14, 40, 196, 40);
  
  // Ship To details
  doc.setFont("helvetica", "bold");
  doc.text("SHIP TO:", 14, 48);
  doc.setFont("helvetica", "normal");
  doc.text(safeText(order.companyName, "Customer"), 14, 53);
  doc.text(safeText(order.customerEmail, ""), 14, 58);
  
  // Table Header
  let y = 70;
  doc.setFillColor(245, 245, 245);
  doc.rect(14, y, 182, 8, "F");
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Description", 16, y + 5.5);
  doc.text("SKU", 90, y + 5.5);
  doc.text("Qty Ordered", 130, y + 5.5);
  doc.text("Qty Packed", 165, y + 5.5);
  
  // Table Rows
  doc.setFont("helvetica", "normal");
  y += 8;
  order.items.forEach(item => {
    const productName = safeText(item.productName, "Item");
    const desc = productName.length > 40 ? productName.substring(0, 40) + "..." : productName;
    doc.text(desc, 16, y + 5.5);
    doc.text(safeText(item.sku, ""), 90, y + 5.5);
    doc.text(item.qty.toString(), 130, y + 5.5);
    doc.text("[   ]", 165, y + 5.5);
    
    y += 8;
  });
  
  if (order.notes) {
    y += 15;
    doc.setFont("helvetica", "bold");
    doc.text("Special Instructions:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(doc.splitTextToSize(safeText(order.notes, ""), 170), 14, y + 5);
  }
  
  return doc;
};
