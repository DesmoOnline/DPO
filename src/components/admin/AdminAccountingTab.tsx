import React, { useState } from 'react';
import { Order } from '../../types';
import { FileSpreadsheet, Receipt } from 'lucide-react';
import { Button } from '../ui/Button';

interface AdminAccountingTabProps {
  orders: Order[];
}

export const AdminAccountingTab: React.FC<AdminAccountingTabProps> = ({ orders }) => {
  const [dateRange, setDateRange] = useState<'30days' | '3months' | 'fy'>('30days');
  const [reportSortBy, setReportSortBy] = useState<'customer' | 'week' | 'month' | 'quarter' | 'fy'>('customer');

  const filteredOrders = orders.filter(o => o.status === 'paid' || o.status === 'approved' || o.status === 'shipped');

  const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalSubtotal = filteredOrders.reduce((sum, o) => sum + (o.subtotal || 0), 0);
  const totalGst = filteredOrders.reduce((sum, o) => sum + (o.gstAmount || 0), 0);
  const totalFreight = filteredOrders.reduce((sum, o) => sum + (o.shippingCharge || 0), 0);

  const exportCSV = () => {
    const headers = ['Order ID', 'Customer', 'Date', 'Type', 'Status', 'Subtotal (AUD)', 'GST (AUD)', 'Shipping (AUD)', 'Total (AUD)'];
    const rows = filteredOrders.map(o => [
      o.id,
      `"${o.companyName || o.customerEmail}"`,
      new Date(o.createdAt).toLocaleDateString('en-AU'),
      o.documentType || 'INVOICE',
      o.status,
      o.subtotal.toFixed(2),
      o.gstAmount.toFixed(2),
      (o.shippingCharge || 0).toFixed(2),
      o.totalAmount.toFixed(2)
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `desmo_accounting_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8" id="accounting_sub_panel">
      {/* Controls & Range Selector */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">Reporting Window:</span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: '30days', label: 'Last 30 Days' },
              { id: '3months', label: 'Last Quarter' },
              { id: 'fy', label: 'Financial Year' }
            ].map(range => (
              <button
                key={range.id}
                onClick={() => setDateRange(range.id as any)}
                className={`text-xs font-semibold px-4 py-2 border rounded-lg transition ${
                  dateRange === range.id
                    ? 'bg-amber-400 border-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider font-mono">Ledger Grouping:</span>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'customer', label: 'By Customer' },
              { id: 'week', label: 'By Week' },
              { id: 'month', label: 'By Month' },
              { id: 'quarter', label: 'By Quarter' },
              { id: 'fy', label: 'By Fiscal Year' }
            ].map(group => (
              <button
                key={group.id}
                onClick={() => setReportSortBy(group.id as any)}
                className={`text-xs font-semibold px-4 py-2 border rounded-lg transition ${
                  reportSortBy === group.id
                    ? 'bg-amber-400 border-amber-500 text-slate-950 font-bold shadow-sm'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {group.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Gross Receipts:</span>
          <span className="text-2xl font-extrabold text-slate-900 block font-sans">${totalRevenue.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Net Sales Subtotal:</span>
          <span className="text-2xl font-extrabold text-slate-900 block font-sans">${totalSubtotal.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Collected GST (10%):</span>
          <span className="text-2xl font-extrabold text-amber-600 block font-sans">${totalGst.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
        </div>
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-2">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block font-bold">Freight Billed:</span>
          <span className="text-2xl font-extrabold text-slate-900 block font-sans">${totalFreight.toLocaleString('en-AU', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {/* Actions & Table */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Receipt className="w-4 h-4 text-amber-500" /> Accounting Audit Ledger ({filteredOrders.length} records)
          </h3>
          <Button onClick={exportCSV} variant="secondary" size="sm" leftIcon={<FileSpreadsheet className="w-4 h-4" />}>
            Export CSV Ledger
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 font-mono text-slate-500 uppercase">
              <tr>
                <th className="p-3">Order / Inv</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Date</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Subtotal</th>
                <th className="p-3 text-right">GST</th>
                <th className="p-3 text-right">Freight</th>
                <th className="p-3 text-right">Total (AUD)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">No accounting entries match selected criteria.</td>
                </tr>
              ) : (
                filteredOrders.map(order => (
                  <tr key={order.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-bold text-slate-900">{order.id}</td>
                    <td className="p-3 font-semibold text-slate-800">{order.companyName || order.customerEmail}</td>
                    <td className="p-3 text-slate-500">{new Date(order.createdAt).toLocaleDateString('en-AU')}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-100 text-emerald-800">
                        {order.status}
                      </span>
                    </td>
                    <td className="p-3 text-right font-mono">${order.subtotal.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono text-amber-600">${order.gstAmount.toFixed(2)}</td>
                    <td className="p-3 text-right font-mono">${(order.shippingCharge || 0).toFixed(2)}</td>
                    <td className="p-3 text-right font-mono font-bold text-slate-900">${order.totalAmount.toFixed(2)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
