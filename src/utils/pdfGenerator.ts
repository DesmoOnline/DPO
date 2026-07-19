import { jsPDF } from "jspdf";
import { Order, CompanySettings } from "../types";

export const generateInvoicePDF = (order: Order, companySettings: CompanySettings): jsPDF => {
  const doc = new jsPDF();
  
  // Header
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("TAX INVOICE", 14, 20);
  
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(companySettings.companyName || companySettings.tradingName, 14, 28);
  doc.text(`ABN: ${companySettings.abn}`, 14, 33);
  doc.text(`Email: ${companySettings.email}`, 14, 38);
  doc.text(companySettings.address, 14, 43);
  
  // Invoice details (Right aligned)
  doc.setFont("helvetica", "bold");
  doc.text(`Invoice No: ${order.id}`, 140, 20);
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
  doc.text(order.companyName, 14, 58);
  doc.text(order.customerEmail, 14, 63);
  
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
    const desc = item.productName.length > 35 ? item.productName.substring(0, 35) + "..." : item.productName;
    doc.text(desc, 16, y + 5.5);
    doc.text(item.sku, 85, y + 5.5);
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
  doc.text(`Bank: ${companySettings.bankName}`, 14, y);
  y += 5;
  doc.text(`Account Name: ${companySettings.accountName}`, 14, y);
  y += 5;
  doc.text(`BSB: ${companySettings.bsb}`, 14, y);
  y += 5;
  doc.text(`ACC: ${companySettings.accountNo}`, 14, y);
  
  y += 10;
  doc.setFontSize(8);
  doc.setTextColor(100, 100, 100);
  doc.text(`* PAYMENT REQUIRED WITHIN ${companySettings.paymentTerms.toUpperCase()}. PLEASE EMAIL REMITTANCE ADVICE TO ${companySettings.email.toUpperCase()}.`, 14, y);
  doc.setTextColor(0, 0, 0); // Reset color
  doc.setFontSize(10);
  
  if (order.notes) {
    y += 15;
    doc.setFont("helvetica", "bold");
    doc.text("Notes:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(order.notes, 14, y + 5);
  }
  
  return doc;
};

export const generatePackingSlipPDF = (order: Order): jsPDF => {
  const doc = new jsPDF();
  
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
  doc.text(order.companyName, 14, 53);
  doc.text(order.customerEmail, 14, 58);
  
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
    const desc = item.productName.length > 40 ? item.productName.substring(0, 40) + "..." : item.productName;
    doc.text(desc, 16, y + 5.5);
    doc.text(item.sku, 90, y + 5.5);
    doc.text(item.qty.toString(), 130, y + 5.5);
    doc.text("[   ]", 165, y + 5.5);
    
    y += 8;
  });
  
  if (order.notes) {
    y += 15;
    doc.setFont("helvetica", "bold");
    doc.text("Special Instructions:", 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(order.notes, 14, y + 5);
  }
  
  return doc;
};
