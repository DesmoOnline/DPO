import React, { useState } from "react";
import { usePortal } from "../context/PortalContext";
import { Wrench, ShieldAlert, CheckCircle, ArrowRight } from "lucide-react";

interface RegistrationFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

export const RegistrationForm: React.FC<RegistrationFormProps> = ({ onSuccess, onCancel }) => {
  const { register } = usePortal();
  
  const [email, setEmail] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !companyName || !deliveryAddress) return;

    setIsSubmitting(true);
    setError(null);
    try {
      await register(email, companyName, deliveryAddress);
      setRegistered(true);
      setTimeout(() => {
        onSuccess();
      }, 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed. Please check credentials.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white border border-slate-200 p-6 md:p-8 space-y-6 shadow-sm rounded-xl" id="registration_container">
      {registered ? (
        <div className="text-center space-y-4 py-6" id="reg_success_state">
          <div className="bg-emerald-50 text-emerald-655 p-3 rounded-xl inline-block border border-emerald-100">
            <CheckCircle className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 tracking-tight">Application Submitted!</h3>
          <p className="text-xs text-slate-500 leading-relaxed font-mono font-semibold uppercase">
            Your wholesale profile for <strong>{companyName}</strong> has been received successfully!
          </p>
          <p className="text-[11px] text-blue-600 font-bold font-mono uppercase tracking-wide">
            Redirecting you to the catalog. Wholesale prices will remain locked until Lew approves your access.
          </p>
        </div>
      ) : (
        <div className="space-y-4" id="reg_form_state">
          <div className="text-center space-y-2">
            <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600 inline-block border border-blue-100">
              <Wrench className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-2">
              Apply for Wholesale Access
            </h2>
            <p className="text-xs text-slate-500 font-semibold tracking-wide">Register your testing agency or engineering organization for customized contract pricing.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="space-y-1">
              <label htmlFor="reg_company" className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-semibold block">
                Company / Agency Name:
              </label>
              <input
                id="reg_company"
                type="text"
                required
                placeholder="E.g., Melbourne Electrical Calibration Services"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-white border border-slate-250 rounded-lg p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition font-medium"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="reg_email" className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-semibold block">
                Corporate Email Address:
              </label>
              <input
                id="reg_email"
                type="email"
                required
                placeholder="E.g., calibration@melbourneservices.com.au"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-white border border-slate-250 rounded-lg p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition font-medium"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="reg_address" className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-semibold block">
                Delivery Address:
              </label>
              <input
                id="reg_address"
                type="text"
                required
                placeholder="E.g., 42 Industrial Rd, Welshpool WA 6106"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="w-full bg-white border border-slate-250 rounded-lg p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition font-medium"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-650 p-3 rounded-lg text-xs font-mono font-semibold uppercase tracking-wide" id="reg_error_banner">
                {error}
              </div>
            )}

            <button
              id="submit_registration_btn"
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold uppercase tracking-widest text-xs py-3 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Submitting application...</span>
              ) : (
                <>
                  Submit Wholesale Request
                  <ArrowRight className="w-4 h-4 text-white" />
                </>
              )}
            </button>
            
            <button
              id="cancel_registration_btn"
              type="button"
              onClick={onCancel}
              className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold uppercase tracking-widest text-xs py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              Cancel
            </button>
          </form>

          <div className="bg-slate-55/60 border border-slate-200 rounded-lg p-4 text-[10px] text-slate-500 flex items-start gap-2 leading-normal font-semibold uppercase">
            <ShieldAlert className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <span>
              All submissions are logged. You will be logged into a temporary <strong>Pending Review</strong> session so you can explore catalog equipment while lew@desmoproducts.com.au verifies commercial credentials.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
