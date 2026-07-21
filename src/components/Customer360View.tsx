import React, { useMemo } from 'react';
import { usePortal } from '../context/PortalContext';
import { CustomerProfile } from '../types';
import { 
  TrendingUp, 
  ShoppingCart, 
  Clock, 
  AlertTriangle, 
  Star, 
  Ticket, 
  Activity, 
  PackageSearch,
  Mail,
  Zap,
  ShieldAlert
} from 'lucide-react';

interface Customer360ViewProps {
  customer: CustomerProfile;
}

export const Customer360View: React.FC<Customer360ViewProps> = ({ customer }) => {
  const { getCustomer360, products } = usePortal();
  
  const metrics = useMemo(() => {
    return getCustomer360(customer.id);
  }, [customer.id, getCustomer360]);

  if (!metrics) {
    return (
      <div className="p-8 text-center text-slate-500">
        No intelligence data available for this customer yet.
      </div>
    );
  }

  // Format currency
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(val);

  // Get product name helper
  const getProductName = (id: string) => {
    const p = products.find(p => p.id === id);
    return p ? p.name : id;
  };

  const getRiskColor = (score: number) => {
    if (score < 20) return "text-green-600 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-900/30 dark:border-green-800";
    if (score < 60) return "text-amber-600 bg-amber-50 border-amber-200 dark:text-amber-400 dark:bg-amber-900/30 dark:border-amber-800";
    return "text-red-600 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-900/30 dark:border-red-800";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900 dark:text-white">
          <Zap className="w-5 h-5 text-blue-600" />
          Customer 360° Intelligence
        </h2>
        <div className={`px-3 py-1.5 rounded-full border text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${getRiskColor(metrics.riskScore)}`}>
          <ShieldAlert className="w-4 h-4" />
          Risk Score: {metrics.riskScore}/100
        </div>
      </div>

      {/* Top level KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <TrendingUp className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Lifetime Value</h3>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(metrics.lifetimeValue)}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <ShoppingCart className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Total Orders</h3>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{metrics.totalOrders}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <Activity className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Avg Order Val</h3>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{formatCurrency(metrics.averageOrderValue)}</p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 mb-2">
            <Star className="w-4 h-4" />
            <h3 className="text-xs font-bold uppercase tracking-wider">Satisfaction</h3>
          </div>
          <p className="text-2xl font-black text-slate-900 dark:text-white">{metrics.satisfactionScore}%</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Behavior & Engagement */}
        <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">
            Behavior & Engagement
          </h3>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Last Login</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-500" />
                {new Date(metrics.behaviorAnalytics.lastLogin).toLocaleDateString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Cart Abandonment</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                {metrics.behaviorAnalytics.cartAbandonmentRate}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Email Open Rate</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-blue-500" />
                {metrics.engagementMetrics.emailOpenRate}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-1">Monthly Sessions</p>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-blue-500" />
                {metrics.engagementMetrics.portalSessionsPerMonth}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs text-slate-500 dark:text-slate-400 font-semibold mb-2">Viewed Categories</p>
            <div className="flex flex-wrap gap-2">
              {metrics.behaviorAnalytics.frequentlyViewedCategories.map(cat => (
                <span key={cat} className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded text-xs font-medium">
                  {cat}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Predictive Intelligence */}
        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-950/40 dark:to-blue-900/20 p-5 rounded-xl border border-indigo-100 dark:border-indigo-800/30 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider border-b border-indigo-100 dark:border-indigo-800/30 pb-2">
            Predictive Intelligence
          </h3>
          
          <div>
            <p className="text-xs text-indigo-700/70 dark:text-indigo-400 font-semibold mb-3">Ideal Next Orders</p>
            <div className="space-y-3">
              {metrics.idealNextOrderPrediction.map(pred => (
                <div key={pred.productId} className="bg-white/60 dark:bg-slate-800/60 p-3 rounded-lg border border-indigo-100 dark:border-indigo-800/30 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <PackageSearch className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                    <span className="text-sm font-bold text-indigo-900 dark:text-indigo-100">{getProductName(pred.productId)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-indigo-100 dark:bg-indigo-950 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500" style={{ width: \`\${pred.probability * 100}%\` }}></div>
                    </div>
                    <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">{Math.round(pred.probability * 100)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs text-indigo-700/70 dark:text-indigo-400 font-semibold mb-2">Payment Behavior</p>
            <div className="flex gap-4">
              <div className="flex items-center gap-1.5 text-sm font-bold text-indigo-900 dark:text-indigo-200">
                <Clock className="w-4 h-4 text-indigo-500" />
                Avg {metrics.paymentBehavior.averageDaysToPay} Days to Pay
              </div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-indigo-900 dark:text-indigo-200">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                {metrics.paymentBehavior.latePaymentsCount} Late
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Support & History */}
      <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider border-b border-slate-100 dark:border-slate-700 pb-2">
          Support Tickets
        </h3>
        
        {metrics.supportTickets.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">No recent support tickets.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-700 text-xs uppercase tracking-wider text-slate-500">
                  <th className="pb-2 font-semibold">ID</th>
                  <th className="pb-2 font-semibold">Subject</th>
                  <th className="pb-2 font-semibold">Date</th>
                  <th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {metrics.supportTickets.map(ticket => (
                  <tr key={ticket.id} className="border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                    <td className="py-2 text-slate-900 dark:text-white font-medium flex items-center gap-1.5">
                      <Ticket className="w-3.5 h-3.5 text-blue-500" />
                      {ticket.id}
                    </td>
                    <td className="py-2 text-slate-700 dark:text-slate-300">{ticket.subject}</td>
                    <td className="py-2 text-slate-500">{new Date(ticket.date).toLocaleDateString()}</td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                        {ticket.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
};
