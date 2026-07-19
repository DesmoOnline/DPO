import React, { useState } from "react";
import { auth } from "../firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { LogIn, AlertCircle } from "lucide-react";

export const LoginView: React.FC<{ onSuccess: () => void; onCancel: () => void }> = ({ onSuccess, onCancel }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (auth) {
        await signInWithEmailAndPassword(auth, email, password);
        onSuccess();
      } else {
        throw new Error("Firebase Authentication is not initialized.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to login. Check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white border border-slate-200 p-6 md:p-8 space-y-6 shadow-sm rounded-xl">
      <div className="text-center space-y-2">
        <div className="bg-blue-50 p-2.5 rounded-xl text-blue-600 inline-block border border-blue-100">
          <LogIn className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 mt-2">
          Admin / Partner Login
        </h2>
        <p className="text-xs text-slate-500 font-semibold tracking-wide">
          Access your personalized wholesale dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="space-y-1">
          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-semibold block">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-white border border-slate-250 rounded-lg p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition font-medium"
            placeholder="lew@desmoproducts.com.au"
          />
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-mono text-slate-500 uppercase tracking-widest font-semibold block">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full bg-white border border-slate-250 rounded-lg p-3 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-blue-500 transition font-medium"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-650 p-3 rounded-lg text-xs font-mono font-semibold uppercase tracking-wide flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold uppercase tracking-widest text-xs py-3 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
        >
          {isLoading ? "Authenticating..." : "Log In"}
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold uppercase tracking-widest text-xs py-2.5 rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
        >
          Cancel
        </button>
      </form>
    </div>
  );
};
