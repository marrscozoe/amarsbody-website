'use client';

import { useState, useEffect } from 'react';

export default function PayPage() {
  const [buttonText, setButtonText] = useState('Open Venmo App');

  useEffect(() => {
    fetch('/api/calendar/consult-settings')
      .then(res => res.json())
      .then(data => {
        if (data.payButtonText) setButtonText(data.payButtonText);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-orange-400 mb-2">AMarsBody</h1>
          <p className="text-gray-400">Payment</p>
        </div>

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
            {buttonText}
          </a>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-700" />
            <span className="text-gray-500 text-sm">Alternate Payment</span>
            <div className="flex-1 h-px bg-gray-700" />
          </div>

          <p className="text-gray-400 text-sm text-center mb-6">
            For other payment options, email Allen at{' '}
            <a
              href="mailto:amarsbody@gmail.com"
              className="text-orange-400 hover:text-orange-300 underline"
            >
              amarsbody@gmail.com
            </a>
          </p>

          <p className="text-gray-600 text-xs text-center">
            After sending payment, Allen will confirm receipt within 1 business day.
          </p>
        </div>

        {/* Footer */}
        <p className="text-gray-600 text-xs text-center mt-6">
          Secure payment via Venmo. Cash and Zelle also accepted — contact Allen for details.
        </p>
      </div>
    </div>
  );
}
