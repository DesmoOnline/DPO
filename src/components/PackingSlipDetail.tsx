import React from "react";
import { usePortal } from "../context/PortalContext";
import { Order } from "../types";
import { ArrowLeft, Printer, Truck, FileText, FileDown } from "lucide-react";
import { generatePackingSlipPDF } from "../utils/pdfGenerator";

interface PackingSlipDetailProps {
  orderId: string;
  onBack: () => void;
  onViewInvoice: (orderId: string) => void;
}

export const PackingSlipDetail: React.FC<PackingSlipDetailProps> = ({ orderId, onBack, onViewInvoice }) => {
  const { orders } = usePortal();

  const order = orders.find(o => o.id === orderId);

  if (!order) {
    return (
      <div className="text-center py-16 bg-white border border-slate-200 shadow-sm rounded-xl" id="pack_not_found">
        <p className="text-slate-500 font-mono text-xs uppercase">Packing slip order reference could not be located.</p>
        <button onClick={onBack} className="mt-4 border border-slate-250 bg-slate-800 text-white text-xs py-2 px-4 font-semibold uppercase rounded-lg shadow-sm">
          Return
        </button>
      </div>
    );
  }

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const pdf = generatePackingSlipPDF(order);
    pdf.save(`packingslip_${order.id}.pdf`);
  };

  return (
    <div className="space-y-8" id="packing_slip_view_container">
      {/* Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button 
          onClick={onBack}
          id="pack_back_btn"
          className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition rounded-lg shadow-sm inline-flex items-center gap-1.5 font-mono"
        >
          <ArrowLeft className="w-4 h-4 text-slate-550" />
          Back to list
        </button>

        <div className="flex items-center gap-3">
          <button
            id="view_invoice_detail_btn"
            onClick={() => onViewInvoice(order.id)}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition rounded-lg shadow-sm inline-flex items-center gap-1.5 font-mono"
          >
            <FileText className="w-4 h-4 text-blue-600" />
            View Tax Invoice
          </button>

          <button
            id="download_pack_slip_pdf_btn"
            onClick={handleDownloadPDF}
            className="border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition rounded-lg shadow-sm inline-flex items-center gap-1.5 font-mono"
          >
            <FileDown className="w-4 h-4 text-blue-600" />
            Download PDF
          </button>
          
          <button
            id="print_pack_slip_btn"
            onClick={handlePrint}
            className="border border-slate-200 bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition rounded-lg shadow-sm inline-flex items-center gap-1.5 font-mono"
          >
            <Printer className="w-4 h-4 text-slate-300" />
            Print Packing Slip
          </button>
        </div>
      </div>

      {/* Slip Canvas */}
      <div className="bg-white border border-slate-200 p-6 md:p-10 rounded-xl shadow-sm space-y-8 print:p-0 print:border-none print:shadow-none" id="printable_pack_canvas">
        {/* Header Block */}
        <div className="flex flex-col sm:flex-row justify-between items-start gap-6 border-b border-slate-200 pb-8">
          <div className="space-y-3">
            <div className="bg-blue-50 text-blue-705 font-mono text-[10px] px-2.5 py-1.5 rounded-lg font-semibold uppercase tracking-wider border border-blue-100 inline-flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-blue-600" />
              Warehouse Dispatch Document
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">PACKING SLIP</h1>
            <div className="flex flex-wrap gap-2 items-center text-xs text-slate-500 font-mono mt-2 font-semibold uppercase">
              <span>Ref Invoice: <strong className="text-slate-800 font-bold">{order.id}</strong></span>
              <span>•</span>
              <span>Date Packed: <strong className="text-slate-800 font-bold">{new Date(order.createdAt).toLocaleDateString('en-AU')}</strong></span>
            </div>
          </div>

          <div className="text-left sm:text-right space-y-1 text-xs font-mono text-slate-600 font-semibold uppercase">
            <h2 className="font-bold text-slate-800 text-sm tracking-tight">Desmo Products Pty Ltd</h2>
            <p className="text-slate-500">18 Testing Rd, Perth</p>
            <p className="text-slate-500">Perth, WA, 6000</p>
            <p className="text-blue-605 font-bold">T: (02) 9812 4009 • E: lew@desmoproducts.com.au</p>
          </div>
        </div>

        {/* Shipping & Delivery Addresses */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 text-xs border-b border-slate-200 pb-6 uppercase font-mono font-semibold">
          <div>
            <h3 className="text-slate-400 font-mono uppercase tracking-widest font-bold mb-2">Ship To / Consignee:</h3>
            <div className="space-y-1 text-slate-700">
              <p className="text-sm font-bold text-slate-900">{order.companyName}</p>
              <p className="text-slate-500">Contact Email: {order.customerEmail}</p>
              <p className="text-slate-500 font-semibold">ID: {order.customerId}</p>
            </div>
          </div>

          <div>
            <h3 className="text-slate-400 font-mono uppercase tracking-widest font-bold mb-2">Logistics & Handling:</h3>
            <div className="space-y-1 text-slate-700">
              <p>Carrier: <strong className="text-slate-900 font-bold">StarTrack / Express Courier</strong></p>
              <p>Dispatch Status: <strong className="text-blue-650 font-bold">{order.status === "shipped" ? "Dispatched" : "Pending Pickup"}</strong></p>
            </div>
          </div>
        </div>

        {/* Packing items list (PRICES STRIPPED) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2">
            <h3 className="text-slate-850 font-bold uppercase tracking-widest font-mono text-xs">Fulfillment Checklist:</h3>
            <span className="text-[10px] text-slate-400 font-mono uppercase font-semibold italic">* Please verify item SKU and quantities on pick</span>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden text-xs">
            <table className="w-full text-left font-mono">
              <thead>
                <tr className="bg-slate-50 text-slate-600 font-mono font-semibold border-b border-slate-200 uppercase text-[10px]">
                  <th className="px-4 py-3 w-16 text-center border-r border-slate-200">Picked</th>
                  <th className="px-4 py-3">Equipment / Instrument Description</th>
                  <th className="px-4 py-3">Manufacturer SKU</th>
                  <th className="px-4 py-3 text-center w-28 border-l border-slate-200">Qty Ordered</th>
                  <th className="px-4 py-3 text-center w-28 border-l border-slate-200">Qty Packaged</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="px-4 py-4 text-center border-r border-slate-200">
                      <div className="w-5 h-5 border border-slate-300 bg-white rounded mx-auto flex items-center justify-center text-xs font-semibold text-slate-800">
                        {order.status === "shipped" ? "✓" : ""}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-slate-900 font-bold uppercase tracking-tight text-sm">
                        {item.productName}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-500 font-bold uppercase">{item.sku}</td>
                    <td className="px-4 py-4 text-center font-bold text-slate-800 text-sm bg-slate-50/50 border-l border-slate-200">{item.qty}</td>
                    <td className="px-4 py-4 text-center text-slate-400 border-l border-slate-200 font-mono">
                      [ &nbsp; &nbsp; ]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Logistics notes */}
        {order.notes && (
          <div className="bg-slate-50 border border-slate-200 p-5 space-y-2 text-xs font-mono uppercase font-semibold rounded-lg">
            <p className="font-bold text-slate-700 tracking-widest">Warehouse Delivery Instructions:</p>
            <p className="text-slate-650 leading-relaxed font-medium">{order.notes}</p>
          </div>
        )}

        {/* Signatures Footer */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-12 pt-12 border-t border-slate-200">
          <div className="space-y-4">
            <div className="border-b border-slate-350 h-10"></div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-800 font-bold">
              Warehouse Dispatch Sign-off
            </p>
            <div className="text-[9px] text-slate-500 font-mono uppercase font-medium">
              Packed by: _________________ Date: ____/____/______
            </div>
          </div>

          <div className="space-y-4">
            <div className="border-b border-slate-350 h-10"></div>
            <p className="text-[10px] font-mono uppercase tracking-widest text-slate-800 font-bold">
              Receiving Organization Sign-off
            </p>
            <div className="text-[9px] text-slate-500 font-mono uppercase font-medium">
              Received by: ________________ Date: ____/____/______
            </div>
          </div>
        </div>

        {/* Disclaimer footer */}
        <div className="text-center text-[9px] text-slate-450 font-mono font-medium uppercase italic pt-6 border-t border-slate-200 leading-normal">
          Any discrepancies in shipment volume must be reported to lew@desmoproducts.com.au within 48 hours of dispatch delivery.
        </div>
      </div>
    </div>
  );
};
