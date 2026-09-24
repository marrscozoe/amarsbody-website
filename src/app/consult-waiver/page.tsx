"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";

type SubmitStatus = "idle" | "loading" | "success" | "error";

export default function ConsultWaiver() {
  const searchParams = useSearchParams();
  const [isMinor, setIsMinor] = useState(false);
  const [agreed, setAgreed] = useState({
    section1: false,
    section2: false,
    section3: false,
    section4: false,
    guardian: false,
  });
  const [clientData, setClientData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    date: new Date().toISOString().split("T")[0],
    guardianName: "",
    guardianRelationship: "",
  });
  const [status, setStatus] = useState<SubmitStatus>("idle");

  // Auto-fill from URL params (passed from consult booking)
  useEffect(() => {
    const fn = searchParams.get("firstName") || "";
    const ln = searchParams.get("lastName") || "";
    const em = searchParams.get("email") || "";
    const ph = searchParams.get("phone") || "";
    const dt = searchParams.get("date") || new Date().toISOString().split("T")[0];
    if (fn || em) {
      setClientData(prev => ({
        ...prev,
        firstName: fn,
        lastName: ln,
        email: em,
        phone: ph,
        date: dt,
      }));
    }
  }, [searchParams]);

  const allAgreed =
    agreed.section1 &&
    agreed.section2 &&
    agreed.section3 &&
    agreed.section4 &&
    (!isMinor || agreed.guardian);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allAgreed) return;
    setStatus("loading");

    try {
      const res = await fetch("/api/waiver/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: `${clientData.firstName} ${clientData.lastName}`.trim(),
          email: clientData.email,
          phone: clientData.phone,
          date: clientData.date,
          isMinor,
          guardianName: isMinor ? clientData.guardianName : null,
          guardianRelationship: isMinor ? clientData.guardianRelationship : null,
          waiverType: "consult",
        }),
      });

      if (!res.ok) throw new Error("Submit failed");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-16">
        <div className="bg-white rounded-2xl p-10 max-w-lg w-full text-center shadow-2xl">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Waiver Signed!</h2>
          <p className="text-gray-600">
            Your waiver is on file. Allen will reach out within 1 business day to schedule your free consultation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
            Personal Training
          </h1>
          <p className="text-lg font-semibold text-orange-600">
            Liability Waiver and Release of Claims
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Please read carefully before signing below.
          </p>
        </div>

        {/* Waiver Form */}
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* SECTION 1 — ASSUMPTION OF RISK */}
          <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-3">1. Assumption of Risk</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Client acknowledges that participation in physical fitness training, exercise programs,
              and related activities involves inherent risks, including but not limited to: muscle
              strains and tears, joint sprains and dislocations, cardiovascular events, ligament and
              tendon injuries, bone fractures, heat exhaustion or heat stroke, and in rare cases,
              serious injury or death. Client acknowledges and accepts all inherent risks associated
              with physical fitness training.
            </p>
            <label className="mt-4 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed.section1}
                onChange={(e) => setAgreed({ ...agreed, section1: e.target.checked })}
                className="mt-0.5 w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">
                I have read and agree to the above <strong>Assumption of Risk</strong> terms.
              </span>
            </label>
          </div>

          {/* SECTION 2 — HEALTH REPRESENTATION */}
          <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-3">
              2. Health Representation and Medical Clearance
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Client represents that he/she/they is in adequate physical condition to participate in
              the personal training program. Client represents that no medical professional has advised
              against participation in exercise or physical fitness activities. Client acknowledges it
              is his/her/their sole responsibility to consult a licensed physician or qualified
              healthcare provider before beginning any exercise program, particularly if Client has or
              suspects any pre-existing medical condition, including but not limited to: cardiovascular
              disease, hypertension, diabetes, asthma, pregnancy, orthopedic conditions, or any other
              condition that may be affected by exercise. Client agrees to immediately notify Trainer
              of any changes in health status, any new diagnoses, medications, or physical limitations
              that may affect Client&apos;s ability to exercise safely. Client confirms they have obtained
              medical clearance or assume full responsibility for doing so.
            </p>
            <label className="mt-4 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed.section2}
                onChange={(e) => setAgreed({ ...agreed, section2: e.target.checked })}
                className="mt-0.5 w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">
                I have read and agree to the above <strong>Health Representation</strong> terms.
              </span>
            </label>
          </div>

          {/* SECTION 3 — RELEASE OF LIABILITY */}
          <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-3">
              3. Release of Liability and Waiver of Claims
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              IN CONSIDERATION of being allowed to participate in personal training services, and
              pursuant to the laws of the State of Texas, Client hereby expressly and specifically
              RELEASES, WAIVES, DISCHARGES, and COVENANTS NOT TO SUE Trainer, their employees,
              agents, independent contractors, representatives, heirs, successors, and assigns
              (collectively, &quot;Released Parties&quot;) from any and all liability, claims, demands,
              losses, damages, costs, and causes of action of any kind or nature whatsoever, whether
              known or unknown, arising out of or related to Client&apos;s participation in personal
              training services.
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mt-3">
              THIS RELEASE EXPRESSLY INCLUDES CLAIMS ARISING FROM THE NEGLIGENCE OF THE RELEASED
              PARTIES. CLIENT EXPRESSLY ACKNOWLEDGES THAT THIS RELEASE APPLIES TO CLAIMS ARISING
              FROM THE ORDINARY NEGLIGENCE OF TRAINER AND ALL RELEASED PARTIES. THIS PROVISION IS
              SPECIFICALLY INTENDED TO SATISFY TEXAS&apos;S &quot;EXPRESS NEGLIGENCE DOCTRINE&quot; AS SET
              FORTH IN <em>Ethyl Corporation v. Daniel Construction Co.</em>, 725 S.W.2d 705 (Tex. 1987).
            </p>
            <p className="text-sm text-gray-700 leading-relaxed mt-3">
              Note: This release does not apply to claims arising from gross negligence, intentional
              misconduct, or willful/wanton acts by the Released Parties, as such claims may not be
              waived under Texas law.
            </p>
            <label className="mt-4 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed.section3}
                onChange={(e) => setAgreed({ ...agreed, section3: e.target.checked })}
                className="mt-0.5 w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">
                I have read and agree to the above <strong>Release of Liability</strong> terms,
                including the express negligence waiver.
              </span>
            </label>
          </div>

          {/* SECTION 4 — INDEMNIFICATION */}
          <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-3">4. Indemnification</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Client agrees to indemnify, defend, and hold harmless the Released Parties from and
              against any and all claims, losses, liabilities, costs, and expenses (including
              reasonable attorneys&apos; fees) arising out of or related to: (a) any breach of this
              Agreement by Client; (b) any act or omission by Client during training sessions; or
              (c) any third-party claims arising from Client&apos;s participation in the personal
              training program.
            </p>
            <label className="mt-4 flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={agreed.section4}
                onChange={(e) => setAgreed({ ...agreed, section4: e.target.checked })}
                className="mt-0.5 w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
              />
              <span className="text-sm text-gray-700">
                I have read and agree to the above <strong>Indemnification</strong> terms.
              </span>
            </label>
          </div>

          {/* SECTION 5 — COMPLIANCE */}
          <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-3">
              5. Compliance with Trainer Instructions
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Client agrees to follow all instructions, guidelines, and safety protocols provided by
              Trainer. Client understands that failure to follow Trainer&apos;s instructions may increase
              the risk of injury and that Trainer shall not be liable for injuries resulting from
              Client&apos;s failure to comply with instructions. Client has the right and responsibility
              to stop any exercise that causes pain, dizziness, shortness of breath, or discomfort
              and to immediately notify Trainer.
            </p>
            {/* No checkbox needed for sections 5-8 — acknowledged with final sign */}
          </div>

          {/* SECTION 6 — EQUIPMENT */}
          <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-3">6. Equipment and Facility</h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Client acknowledges that the use of exercise equipment, whether provided by Trainer or
              belonging to a third-party facility, carries inherent risks. Client agrees to inspect
              equipment before use and to notify Trainer immediately of any equipment that appears
              damaged or unsafe. Trainer shall not be liable for injuries caused by defective
              third-party equipment or facilities not under Trainer&apos;s direct control.
            </p>
          </div>

          {/* SECTION 7 — GOVERNING LAW */}
          <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-3">
              7. Governing Law and Severability
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              This Agreement shall be governed by and construed in accordance with the laws of the
              State of Texas, without regard to its conflict of law provisions. The parties agree
              that any disputes arising under this Agreement shall be resolved exclusively in the
              state or federal courts located in the county where training services are provided
              in Texas. If any provision of this Agreement is found to be unenforceable under
              applicable law, the remaining provisions shall continue in full force and effect.
            </p>
          </div>

          {/* SECTION 8 — ENTIRE AGREEMENT */}
          <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-3">
              8. Entire Agreement and Voluntary Execution
            </h2>
            <p className="text-sm text-gray-700 leading-relaxed">
              Client affirms that he/she/they: (1) has read this entire Agreement and understands
              its contents; (2) is signing this Agreement voluntarily and of their own free will;
              (3) is at least 18 years of age or, if a minor, a parent/legal guardian is signing
              on Client&apos;s behalf; (4) has had the opportunity to consult legal counsel before
              signing; and (5) understands this Agreement limits their legal rights.
            </p>
          </div>

          {/* CLIENT INFO */}
          <div className="bg-white rounded-xl p-6 shadow border border-gray-200">
            <h2 className="text-base font-bold text-gray-900 mb-4">Client Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={clientData.firstName}
                  onChange={(e) =>
                    setClientData({ ...clientData, firstName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="First name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={clientData.lastName}
                  onChange={(e) =>
                    setClientData({ ...clientData, lastName: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Last name"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={clientData.email}
                  onChange={(e) =>
                    setClientData({ ...clientData, email: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="you@email.com"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Phone (optional)
                </label>
                <input
                  type="tel"
                  value={clientData.phone}
                  onChange={(e) =>
                    setClientData({ ...clientData, phone: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="(830) 555-1234"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Date *</label>
                <input
                  type="date"
                  required
                  value={clientData.date}
                  onChange={(e) =>
                    setClientData({ ...clientData, date: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            {/* Minor checkbox */}
            <div className="mt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isMinor}
                  onChange={(e) => setIsMinor(e.target.checked)}
                  className="w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                />
                <span className="text-sm text-gray-700">
                  Client is under 18 years of age
                </span>
              </label>
            </div>

            {/* Guardian section — only shows if minor */}
            {isMinor && (
              <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200 space-y-4">
                <p className="text-sm font-semibold text-orange-700">
                  Parent / Legal Guardian Information
                </p>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Guardian Full Legal Name *
                  </label>
                  <input
                    type="text"
                    required={isMinor}
                    value={clientData.guardianName}
                    onChange={(e) =>
                      setClientData({ ...clientData, guardianName: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="Parent or legal guardian name"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Relationship to Client *
                  </label>
                  <input
                    type="text"
                    required={isMinor}
                    value={clientData.guardianRelationship}
                    onChange={(e) =>
                      setClientData({ ...clientData, guardianRelationship: e.target.value })
                    }
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="e.g. Mother, Father, Legal Guardian"
                  />
                </div>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed.guardian}
                    onChange={(e) =>
                      setAgreed({ ...agreed, guardian: e.target.checked })
                    }
                    className="mt-0.5 w-4 h-4 text-orange-500 rounded focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">
                    I am the parent/legal guardian and agree to the above terms on behalf
                    of the minor client.
                  </span>
                </label>
              </div>
            )}
          </div>

          {/* FINAL ACKNOWLEDGMENT */}
          <div className="bg-orange-50 rounded-xl p-6 border border-orange-200">
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              By clicking below, I acknowledge that I have read and understood all 8 sections of
              this Agreement, and that checking the boxes above confirms my agreement to each
              section as noted. I understand this is a legally binding document.
            </p>
            <button
              type="submit"
              disabled={!allAgreed || status === "loading"}
              className="w-full bg-orange-500 text-white font-bold py-3 px-8 rounded-full hover:bg-orange-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {status === "loading" ? "SUBMITTING..." : "I AGREE & SIGN WAIVER →"}
            </button>
            {status === "error" && (
              <p className="text-red-500 text-sm text-center mt-3">
                Something went wrong. Please try again or email amarsbody@gmail.com
              </p>
            )}
            <p className="text-center text-gray-400 text-xs mt-2">
              This document is drafted for use in Texas. Consult a licensed Texas attorney to
              ensure this waiver is valid and enforceable for your specific circumstances.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
