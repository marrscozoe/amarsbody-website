'use client';

import { useState } from 'react';

export default function PayPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-orange-400 mb-2">AMarsBody</h1>
          <p className="text-gray-400">Payment</p>
        </div>

        {!submitted ? (
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-2xl">
            {/* Venmo QR Code */}
            <div className="text-center mb-8">
              <div className="bg-white rounded-2xl p-4 inline-block mb-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/venmo-qr.png"
                  alt="Venmo QR Code"
                  width={240}
                  height={240}
                  className="w-60 h-60 object-contain"
                  style={{ imageRendering: 'pixelated' }}
                />
              </div>
              <p className="text-gray-300 font-semibold mb-1">Scan to pay with Venmo</p>
              <p className="text-gray-500 text-sm">or search <span className="text-orange-400 font-semibold">@Allen-Marrs</span></p>
            </div>

            {/* Venmo Link Button */}
            <a
              href="https://venmo.com/u/Allen-Marrs"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-orange-500 hover:bg-orange-600 text-white py-3 rounded-xl font-bold text-center transition-colors mb-6"
            >
              Open Venmo App
            </a>

            {/* Divider */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex-1 h-px bg-gray-700" />
              <span className="text-gray-500 text-sm">Optional</span>
              <div className="flex-1 h-px bg-gray-700" />
            </div>

            {/* Optional Info Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-1">Your Name (optional)</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-xl border border-gray-600 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-gray-400 text-sm mb-1">Your Email (optional)</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@email.com"
                  className="w-full bg-gray-700 text-white px-4 py-3 rounded-xl border border-gray-600 focus:border-orange-500 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-gray-600 hover:bg-gray-500 text-white py-3 rounded-xl font-semibold transition-colors"
              >
                I've Sent Payment
              </button>
            </form>

            <p className="text-gray-600 text-xs text-center mt-4">
              After sending payment, Allen will confirm receipt within 1 business day.
            </p>
          </div>
        ) : (
          <div className="bg-gray-800 rounded-2xl p-8 border border-gray-700 shadow-2xl text-center">
            <div className="text-5xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-white mb-2">Payment Notified!</h2>
            <p className="text-gray-400 mb-6">
              Allen will confirm your payment within 1 business day. Thank you!
            </p>
            <a
              href="/"
              className="inline-block bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-xl font-bold transition-colors"
            >
              Back to Home
            </a>
          </div>
        )}

        {/* Footer */}
        <p className="text-gray-600 text-xs text-center mt-6">
          Secure payment via Venmo. Cash and Zelle also accepted — contact Allen for details.
        </p>
      </div>
    </div>
  );
}
