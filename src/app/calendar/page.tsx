"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CalendarPage() {
  const router = useRouter();
  const [showClientLogin, setShowClientLogin] = useState(false);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [ctaText, setCtaText] = useState("Book Now");
  const [clientForm, setClientForm] = useState({ firstName: "", lastName: "", password: "" });
  const [adminPassword, setAdminPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetch("/api/calendar/consult-settings")
      .then(r => r.json())
      .then(data => {
        if (data.ctaText) setCtaText(data.ctaText);
      })
      .catch(() => {});
  }, []);

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    
    try {
      const res = await fetch("/api/calendar/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", ...clientForm })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      
      localStorage.setItem("calendarClient", JSON.stringify(data));
      setSuccess("Login successful! Redirecting...");
      
      setTimeout(() => {
        router.push("/calendar/book");
      }, 500);
      
      return;
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    
    try {
      const res = await fetch("/api/calendar/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword })
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      
      localStorage.setItem("calendarAdmin", "true");
      router.push("/calendar/admin");
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8 pt-8">
          <h1 className="text-3xl font-bold text-orange-500 mb-2">AMarsBody</h1>
          <p className="text-gray-400">Calendar Booking System</p>
        </div>

        {/* Main Menu */}
        {!showClientLogin && !showAdminLogin && (
          <div className="space-y-4">
            {/* Existing Clients */}
            <button
              onClick={() => setShowClientLogin(true)}
              className="w-full py-4 px-6 bg-gray-800 hover:bg-gray-700 text-white font-semibold rounded-lg border border-gray-700 transition-colors"
            >
              Client Login
            </button>
            
            {/* Admin */}
            <button
              onClick={() => setShowAdminLogin(true)}
              className="w-full py-3 px-6 bg-gray-900 hover:bg-gray-800 text-gray-400 font-medium rounded-lg border border-gray-800 transition-colors text-sm"
            >
              Admin Login
            </button>
          </div>
        )}

        {/* Client Login Form */}
        {showClientLogin && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center mb-4">Client Login</h2>
            
            <form onSubmit={handleClientLogin} className="space-y-4">
              <input
                type="text"
                placeholder="First Name"
                value={clientForm.firstName}
                onChange={(e) => setClientForm({ ...clientForm, firstName: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                required
              />
              <input
                type="text"
                placeholder="Last Name"
                value={clientForm.lastName}
                onChange={(e) => setClientForm({ ...clientForm, lastName: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                required
              />
              <input
                type="password"
                placeholder="Password"
                value={clientForm.password}
                onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                required
              />
              
              {error && <p className="text-red-500 text-sm">{error}</p>}
              {success && <p className="text-green-500 text-sm">{success}</p>}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
            

            
            <button
              onClick={() => { setShowClientLogin(false); setError(""); setClientForm({ firstName: "", lastName: "", password: "" }); }}
              className="w-full py-2 text-gray-400 hover:text-white transition-colors"
            >
              Back
            </button>
          </div>
        )}

        {/* Admin Login Form */}
        {showAdminLogin && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-center mb-4">Admin Login</h2>
            
            <form onSubmit={handleAdminLogin} className="space-y-4">
              <input
                type="password"
                placeholder="Admin Password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                required
              />
              
              {error && <p className="text-red-500 text-sm">{error}</p>}
              
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
              >
                {loading ? "Logging in..." : "Login"}
              </button>
            </form>
            
            <button
              onClick={() => { setShowAdminLogin(false); setError(""); setAdminPassword(""); }}
              className="w-full py-2 text-gray-400 hover:text-white transition-colors"
            >
              Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
