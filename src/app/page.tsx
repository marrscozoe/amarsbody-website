"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [ctaText, setCtaText] = useState("Book a Free Consultation");
  const [heroFormData, setHeroFormData] = useState({ firstName: "", email: "", phone: "", goal: "" });
  const [heroFormStatus, setHeroFormStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [contactFormData, setContactFormData] = useState({ name: "", email: "", phone: "", message: "" });
  const [contactFormStatus, setContactFormStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [showStickyBar, setShowStickyBar] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      const heroBottom = heroRef.current?.getBoundingClientRect().bottom ?? 0;
      setScrolled(window.scrollY > 50);
      setShowStickyBar(window.scrollY > heroBottom);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const scrollContainer = scrollRef.current;
    if (!scrollContainer) return;
    let scrollPos = 0;
    const interval = setInterval(() => {
      scrollPos += 2;
      if (scrollPos >= scrollContainer.scrollWidth - scrollContainer.clientWidth) {
        scrollPos = 0;
      }
      scrollContainer.scrollLeft = scrollPos;
    }, 30);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    fetch("/api/calendar/consult-settings")
      .then(r => r.json())
      .then(data => {
        if (data.ctaText) setCtaText(data.ctaText);
      })
      .catch(() => {});
  }, []);

  const handleHeroSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!heroFormData.firstName || !heroFormData.email) return;
    setHeroFormStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: heroFormData.firstName,
          email: heroFormData.email,
          phone: heroFormData.phone,
          message: heroFormData.goal ? `Goal/Event: ${heroFormData.goal}` : 'Interested in getting started with training',
        }),
      });
      if (res.ok) {
        setHeroFormStatus("success");
      } else {
        setHeroFormStatus("error");
      }
    } catch {
      setHeroFormStatus("error");
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactFormData.name || !contactFormData.email) return;
    setContactFormStatus("loading");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(contactFormData),
      });
      if (res.ok) {
        setContactFormStatus("success");
        setContactFormData({ name: "", email: "", phone: "", message: "" });
      } else {
        setContactFormStatus("error");
      }
    } catch {
      setContactFormStatus("error");
    }
  };

  const whoItForItems = [
    { icon: "✨", text: "Brides wanting to look amazing for their wedding" },
    { icon: "🏖️", text: "Anyone preparing for beach vacations or trips" },
    { icon: "👗", text: "People with reunions or big events coming up" },
    { icon: "💪", text: "Anyone tired of fad diets and quick fixes" },
    { icon: "📈", text: "Professionals who want sustainable results" },
    { icon: "🌟", text: "Anyone who wants to feel confident in their body" },
  ];

  const testimonials = [
    {
      quote: "Lost 25 lbs in 12 weeks. Best decision I ever made. No gimmicks, just hard work and a solid plan.",
      name: "Danielle P.",
      program: "EVENT READY Program",
    },
    {
      quote: "Finally understand nutrition. Down 18 lbs and keeping it off. Life changer.",
      name: "Blake B.",
      program: "MUSCLE Program",
    },
    {
      quote: "Gained 5 lbs of muscle in 1 month. Stronger than I've ever been.",
      name: "Michelle D.",
      program: "STRENGTH Program",
    },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Sticky Mobile CTA Bar */}
      {showStickyBar && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-orange-500 text-white py-3 px-4 flex items-center justify-center shadow-lg lg:hidden">
          <a
            href="#contact"
            className="font-bold text-sm flex items-center gap-1 w-full justify-center"
          >
            Get Your Free Consultation →
          </a>
        </div>
      )}

      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white border-b border-gray-200 shadow-md py-3" : "py-4 bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <button
            className="text-gray-700 mr-3"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>

          <a href="#" className="flex items-center gap-2">
            <img src="/logo.svg" alt="AMarsBody" className="h-20 md:h-12" />
          </a>

          <div className="hidden lg:flex gap-6 text-sm font-medium text-gray-700">
            <a href="#programs" className="hover:text-orange-500 transition-colors">PROGRAMS</a>
            <a href="#services" className="hover:text-orange-500 transition-colors">SERVICES</a>
            <a href="#about" className="hover:text-orange-500 transition-colors">ABOUT</a>
            <a href="#contact" className="hover:text-orange-500 transition-colors">CONTACT</a>
          </div>

          <a href="#contact" className="hidden lg:block bg-orange-500 text-gray-100 font-bold px-5 py-2 rounded-full text-sm hover:bg-orange-600 transition-all">
            START NOW
          </a>
        </div>

        {menuOpen && (
          <div className="bg-white border-t py-4 px-6">
            <div className="flex flex-col gap-4 text-sm font-medium">
              <a href="/programs" className="text-gray-700 hover:text-orange-500" onClick={() => setMenuOpen(false)}>CLIENT PROGRAMS</a>
              <a href="#programs" className="text-gray-700 hover:text-orange-500" onClick={() => setMenuOpen(false)}>PROGRAMS</a>
              <a href="#services" className="text-gray-700 hover:text-orange-500" onClick={() => setMenuOpen(false)}>SERVICES</a>
              <a href="#about" className="text-gray-700 hover:text-orange-500" onClick={() => setMenuOpen(false)}>ABOUT</a>
              <a href="#contact" className="text-gray-700 hover:text-orange-500" onClick={() => setMenuOpen(false)}>CONTACT</a>
            </div>
          </div>
        )}
      </nav>

      {/* HERO SECTION */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden mt-16">
        <div className="absolute inset-0">
          <img src="/hero-gym.jpg" alt="Gym" className="w-full h-full object-cover object-[90%_center]" />
          <div className="absolute inset-0 bg-black/40" />
        </div>

        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pt-10 pb-16">
          <div className="text-center mb-8">
            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-8xl font-extrabold mb-6 leading-tight tracking-tight">
              <span className="text-white drop-shadow-lg">BUILD YOUR</span>
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500">
                DREAM BODY
              </span>
            </h1>
            <p className="text-3xl md:text-4xl text-orange-400 font-bold mb-2">Allen Marrs</p>
            <p className="text-xl md:text-2xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Personal training built for men <span className="text-orange-400 font-semibold">and women</span> in New Braunfels — weddings, beach trips, reunions, photoshoots, whatever you&apos;re training for. No gimmicks. Real results.
            </p>
          </div>

          {/* HERO LEAD CAPTURE FORM */}
          <div className="max-w-md mx-auto">
            {heroFormStatus === "success" ? (
              <div className="bg-white/95 rounded-2xl p-8 text-center shadow-2xl">
                <div className="text-5xl mb-4">🎉</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">You&apos;re In!</h3>
                <p className="text-gray-600">Allen will reach out within 1 business day. Can&apos;t wait to help you hit your goals!</p>
              </div>
            ) : (
              <form
                onSubmit={handleHeroSubmit}
                className="bg-white/95 rounded-2xl p-6 shadow-2xl"
              >
                <p className="text-center text-orange-600 font-bold text-lg mb-4">Start Your Transformation — Free!</p>
                <div className="space-y-3">
                  <div>
                    <input
                      type="text"
                      placeholder="FIRST NAME *"
                      value={heroFormData.firstName}
                      onChange={(e) => setHeroFormData({ ...heroFormData, firstName: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <input
                      type="email"
                      placeholder="EMAIL *"
                      value={heroFormData.email}
                      onChange={(e) => setHeroFormData({ ...heroFormData, email: e.target.value })}
                      required
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <input
                      type="tel"
                      placeholder="PHONE (optional)"
                      value={heroFormData.phone}
                      onChange={(e) => setHeroFormData({ ...heroFormData, phone: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-400"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      placeholder="GOAL / EVENT (e.g. Wedding in June, Beach trip)"
                      value={heroFormData.goal}
                      onChange={(e) => setHeroFormData({ ...heroFormData, goal: e.target.value })}
                      className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-400"
                    />
                  </div>
                </div>
                {heroFormStatus === "error" && (
                  <div className="mt-3 text-center">
                    <p className="text-red-400 text-sm mb-2">Something went wrong. Please try again.</p>
                    <p className="text-gray-400 text-sm">
                      Or email Allen directly:{' '}
                      <a href="mailto:amarsbody@gmail.com" className="text-orange-400 hover:text-orange-300 font-medium">
                        amarsbody@gmail.com
                      </a>
                    </p>
                  </div>
                )}
                <button
                  type="submit"
                  disabled={heroFormStatus === "loading"}
                  className="w-full mt-4 bg-orange-500 text-white font-bold py-3 px-8 rounded-full hover:bg-orange-600 transition-all transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {heroFormStatus === "loading" ? "SENDING..." : "GET STARTED FREE →"}
                </button>
                <p className="text-center text-gray-400 text-xs mt-2">No spam. Allen responds within 1 business day.</p>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* CONSULT CTA — QR BAND */}
      <section className="bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 py-10 px-6">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="text-center md:text-left">
            <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-2">{ctaText}</h2>
            <p className="text-orange-100 text-lg">Scan the QR code or tap the button to schedule with Allen.</p>
          </div>
          <div className="flex items-center gap-6 flex-shrink-0">
            <img src="/qr/amarsbody-consult.png" alt="Scan to book a consult" className="w-28 h-28 rounded-xl shadow-lg bg-white p-1" />
            <a
              href="/calendar/consult"
              className="bg-white text-orange-600 font-bold px-6 py-4 rounded-full text-lg hover:bg-orange-50 transition-all shadow-lg"
            >
              Book a Free Consult →
            </a>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF — TESTIMONIALS RIGHT AFTER HERO */}
      <section className="py-16 px-6 bg-gray-50 border-t border-gray-200">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-2">
            <span className="text-gray-900">REAL CLIENT </span>
            <span className="text-orange-600">RESULTS</span>
          </h2>
          <p className="text-center text-gray-500 mb-10">Women 30–55 trust Allen to get them ready for what matters.</p>
          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex gap-1 mb-3">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className="text-orange-500 text-lg">★</span>
                  ))}
                </div>
                <p className="text-gray-700 mb-4 italic leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
                <div className="font-bold text-gray-900">{t.name}</div>
                <div className="text-sm text-orange-600">{t.program}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Allen Portrait - Above Stats */}
      <section className="py-12 bg-gray-900">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <img
            src="/photo-6-ezcurl.jpg"
            alt="Allen Marrs - Personal Trainer"
            style={{ maxWidth: "500px", width: "100%", height: "auto" }}
            className="rounded-2xl mx-auto shadow-2xl shadow-orange-500/20"
          />
        </div>
      </section>

      {/* Allen in Action */}
      <section className="py-12 bg-gray-900">
        <div className="max-w-6xl mx-auto px-6">
          <img
            src="/photo-2-training.jpg"
            alt="Allen Training Clients"
            style={{ maxWidth: "800px", width: "100%", height: "auto" }}
            className="rounded-2xl mx-auto shadow-2xl"
          />
        </div>
      </section>

      {/* Location */}
      <div className="bg-gray-900 px-6 pt-8">
        <div className="max-w-6xl mx-auto text-center">
          <div className="inline-block bg-orange-900/30 border border-orange-500/30 rounded-xl px-6 py-3">
            <div className="text-2xl font-bold text-orange-400">New Braunfels TX</div>
            <div className="text-sm text-gray-400">Based</div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <section className="py-20 px-6 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-4">
            HOW IT <span className="text-orange-500">WORKS</span>
          </h2>
          <p className="text-center text-gray-400 mb-16 text-lg" />

          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-orange-500 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-white">1</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Book a Call</h3>
              <p className="text-gray-400">Schedule a free consultation to discuss your goals and fitness background.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-orange-500 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-white">2</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">Set Your Goals</h3>
              <p className="text-gray-400">Plan a customized training and nutrition program tailored to your goals.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-orange-500 flex items-center justify-center mb-4">
                <span className="text-2xl font-bold text-white">3</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">See Results</h3>
              <p className="text-gray-400">We workout 2 to 3 times a week to achieve your goal.</p>
            </div>
            <div className="text-center bg-gray-800 rounded-xl p-4 border border-gray-700">
              <p className="text-gray-400 text-lg">In person sessions</p>
              <p className="text-gray-400 text-lg mb-2">at</p>
              <p className="text-orange-400 text-xl font-bold">Eisbar Strength & Fitness</p>
              <p className="text-orange-400 text-xl">1260 FM1863 BLDG 4, New Braunfels TX 78132</p>
              <p className="text-orange-400 text-xl mt-2" />
            </div>
          </div>
        </div>
      </section>

      {/* WHO THIS IS FOR */}
      <section className="py-20 bg-gray-900 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 mb-8 text-center">
          <h2 className="text-4xl font-bold mb-2">
            <span className="text-gray-100">WHO THIS IS </span>
            <span className="text-orange-400">FOR</span>
          </h2>
        </div>

        <div ref={scrollRef} className="flex overflow-x-auto gap-6 px-6 pb-8 scrollbar-hide" style={{ WebkitOverflowScrolling: "touch" }}>
          {[...whoItForItems, ...whoItForItems].map((item, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-72 bg-gray-800 border border-gray-700 rounded-2xl p-6 text-center hover:border-orange-500/50 hover:shadow-xl transition-all cursor-pointer"
            >
              <p className="text-gray-200 font-medium">{item.text}</p>
            </div>
          ))}
        </div>

        {/* Secondary CTA */}
        <div className="max-w-6xl mx-auto px-6 mt-6 text-center">
          <p className="text-gray-400 mb-4">Sound like you? Let&apos;s talk.</p>
          <a
            href="#contact"
            className="inline-block bg-orange-500 text-white font-bold py-3 px-8 rounded-full hover:bg-orange-600 transition-all"
          >
            Book Your Free Call →
          </a>
        </div>
      </section>

      {/* Gallery Section */}
      <section className="py-16 bg-gray-900 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6">
          <h2 className="text-4xl md:text-5xl font-bold text-center text-white mb-4">
            EISBAR <span className="text-orange-500">GYM</span>
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <img src="/file_100---d17df01a-ecb4-4185-b3ef-e9b93c498e96.jpg" alt="Dumbbells and kettlebells" className="h-48 md:h-64 rounded-lg object-cover" />
            <img src="/file_101---b4bb9591-06a3-49bc-bb21-0d92d57d9866.jpg" alt="Cardio and strength" className="h-48 md:h-64 rounded-lg object-cover" />
            <img src="/file_102---209c8f54-f71e-48d4-bf16-64fa24dd14dc.jpg" alt="Benches and plates" className="h-48 md:h-64 rounded-lg object-cover" />
            <img src="/file_103---86f751b9-67bd-47c6-adc0-7af6a68ea5e8.jpg" alt="Power racks" className="h-48 md:h-64 rounded-lg object-cover" />
            <img src="/file_104---232bc9e2-a851-4056-9be0-21a1a8c271ed.jpg" alt="Leg machines" className="h-48 md:h-64 rounded-lg object-cover" />
            <img src="/file_105---ccb832bf-1bc5-4de6-b944-9712c069d36e.jpg" alt="Main power rack" className="h-48 md:h-64 rounded-lg object-cover" />
            <img src="/file_106---4a0b2012-ebf6-489e-9dfd-df59d433088e.jpg" alt="Dumbbell area" className="h-48 md:h-64 rounded-lg object-cover" />
          </div>
        </div>
      </section>

      {/* PROGRAMS */}
      <section id="programs" className="py-32 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold mb-4 text-center">
            <span className="text-gray-900">TRAINING </span>
            <span className="text-orange-600">PROGRAMS</span>
          </h2>
          <p className="text-gray-600 text-center mb-20 max-w-xl mx-auto">Structured programs designed around YOUR goals and timeline.</p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group bg-white border border-gray-200 rounded-3xl p-8 hover:border-orange-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-orange-600 transition-colors">EVENT READY</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">Get ready for your big moment — weddings, beach trips, reunions, photoshoots. 12-week focused program.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-700"><span className="text-orange-600">✓</span> Event-specific training</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><span className="text-orange-600">✓</span> Nutrition guide</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><span className="text-orange-600">✓</span> Weekly check-ins</li>
              </ul>
            </div>

            <div className="group bg-white border border-gray-200 rounded-3xl p-8 hover:border-orange-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-orange-600 transition-colors">MUSCLE</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">Build lean muscle mass with progressive overload training and proper nutrition strategy. Compatible with GLP1 medications.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-700"><span className="text-orange-600">✓</span> Hypertrophy focused</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><span className="text-orange-600">✓</span> Macro calculator</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><span className="text-orange-600">✓</span> Form analysis</li>
              </ul>
            </div>

            <div className="group bg-white border border-gray-200 rounded-3xl p-8 hover:border-orange-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-orange-600 transition-colors">STRENGTH</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">Master the big lifts — squat, deadlift, bench press — with proven programming.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-700"><span className="text-orange-600">✓</span> Strength progression</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><span className="text-orange-600">✓</span> 1-on-1 form checks</li>
                <li className="flex items-center gap-2 text-sm text-gray-700"><span className="text-orange-600">✓</span> Core use</li>
              </ul>
            </div>
          </div>

          {/* Secondary CTA after Programs */}
          <div className="text-center mt-14">
            <p className="text-gray-500 mb-4 text-lg">Ready to find your program?</p>
            <a
              href="#contact"
              className="inline-block bg-orange-500 text-white font-bold py-3 px-10 rounded-full text-lg hover:bg-orange-600 transition-all transform hover:scale-[1.02]"
            >
              Get Your Free Consultation →
            </a>
          </div>
        </div>
      </section>

      {/* Photo 3 - Above Services */}
      <section className="py-12 px-6 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <img src="/photo-3-smile.jpg" alt="Allen Marrs" style={{ maxWidth: "400px", width: "100%", height: "auto" }} className="rounded-2xl mx-auto shadow-2xl" />
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-32 px-6 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold mb-4 text-center">
            <span className="text-gray-100">WHAT I </span>
            <span className="text-orange-400">DO</span>
          </h2>
          <p className="text-gray-400 text-center mb-20 max-w-xl mx-auto">Personal Training and Nutrition Coaching</p>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="group bg-gray-800 border border-gray-700 rounded-3xl p-8 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-2">
              <h3 className="text-2xl font-bold mb-4 text-gray-100 group-hover:text-orange-400 transition-colors">Personal Training</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">One-on-one sessions tailored to YOUR goals. Build strength and transform your body.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-orange-400">✓</span> Custom workouts</li>
                <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-orange-400">✓</span> Form correction</li>
                <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-orange-400">✓</span> Progress tracking</li>
              </ul>
            </div>

            <div className="group bg-gray-800 border border-gray-700 rounded-3xl p-8 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-2">
              <h3 className="text-2xl font-bold mb-4 text-gray-100 group-hover:text-orange-400 transition-colors">Nutrition Coaching</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">Eat to support your goals. No starvation — just proper nutrition that fits your life.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-orange-400">✓</span> Custom meal plans</li>
                <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-orange-400">✓</span> Macro tracking</li>
                <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-orange-400">✓</span> Habit building</li>
              </ul>
            </div>

            <div className="group bg-gray-800 border border-gray-700 rounded-3xl p-8 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-2">
              <h3 className="text-2xl font-bold mb-4 text-gray-100 group-hover:text-orange-400 transition-colors">Online Coaching</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">Train anywhere. Personalized programming with weekly check-ins.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-orange-400">✓</span> Remote training</li>
                <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-orange-400">✓</span> Online support</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="py-32 px-6 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl font-bold mb-6">
                <span className="text-gray-100">ABOUT </span>
                <span className="text-orange-400">ME</span>
              </h2>
              <p className="text-xl text-gray-300 mb-6 leading-relaxed">
                I&apos;m Allen — personal trainer specializing in nutrition and fat loss. I help <strong className="text-orange-300">men and women</strong> get in the best shape of their lives — ready for what matters most.
              </p>
              <p className="text-gray-400 mb-6 leading-relaxed">
                I&apos;m a husband and proud dad of 2 sons. When I&apos;m not training, I love hiking and being outdoors. I believe in making fitness fit your life — not the other way around.
              </p>
              <p className="text-gray-400 mb-8 leading-relaxed">
                I focus on what matters: helping you hit your goals with real food, real training, and accountability.
              </p>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-gray-800/20 rounded-3xl blur-3xl" />
              <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700 mb-6">
                <img src="/photo-1-bench.jpg" alt="Allen Marrs - Personal Trainer" style={{ maxWidth: "100%", width: "100%", height: "auto" }} className="rounded-2xl mb-4" />
                <p className="text-center text-gray-400 text-sm">Allen Marrs — Personal Training & Nutrition</p>
              </div>
              <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
                <h3 className="text-2xl font-bold mb-6 text-orange-400">Credentials</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-[auto_1fr] gap-4 py-3 border-b border-gray-700">
                    <span className="text-gray-400">Certification</span>
                    <span className="font-semibold text-gray-100 text-right">Cooper Institute for Aerobics Research</span>
                  </div>
                  <div className="grid grid-cols-[auto_1fr] gap-4 py-3 border-b border-gray-700">
                    <span className="text-gray-400">Specialty</span>
                    <span className="font-semibold text-gray-100 text-right">Fat Loss + Nutrition</span>
                  </div>
                  <div className="grid grid-cols-[auto_1fr] gap-4 py-3 border-b border-gray-700">
                    <span className="text-gray-400">Training</span>
                    <span className="font-semibold text-gray-100 text-right">In-person · Online</span>
                  </div>
                  <div className="grid grid-cols-[auto_1fr] gap-4 py-3 border-b border-gray-700">
                    <span className="text-gray-400">Nutrition</span>
                    <span className="font-semibold text-gray-100 text-right">In-person · Online</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CLIENT RESULTS — moved up, original location replaced by hero copy */}
      <section className="py-32 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold mb-4 text-center">
            <span className="text-gray-900">CLIENT </span>
            <span className="text-orange-600">RESULTS</span>
          </h2>
          <p className="text-gray-600 text-center mb-20">Real results from real clients.</p>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-white border border-gray-200 rounded-3xl p-8">
                <div className="flex gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <span key={s} className="text-orange-500">★</span>
                  ))}
                </div>
                <p className="text-gray-700 mb-6 italic">&ldquo;{t.quote}&rdquo;</p>
                <div className="font-semibold text-gray-900">— {t.name}</div>
                <div className="text-sm text-gray-500">{t.program}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CONTACT SECTION */}
      <section id="contact" className="py-32 px-6 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-gray-900 to-gray-900" />
        <div className="absolute inset-0" style={{ backgroundImage: "radial-gradient(circle at 50% 50%, rgba(249,115,22,0.1) 0%, transparent 50%)" }} />
        <div className="relative z-10 max-w-xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-gray-100">READY TO </span>
            <span className="text-orange-400">START?</span>
          </h2>
          <p className="text-xl text-gray-400 mb-10">Fill out the form and Allen will get back to you within 1 business day.</p>

          {contactFormStatus === "success" ? (
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-orange-500/30">
              <div className="text-5xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-white mb-2">Message Sent!</h3>
              <p className="text-gray-300">Allen will be in touch within 1 business day. Can&apos;t wait to help you reach your goals!</p>
            </div>
          ) : (
            <form
              onSubmit={handleContactSubmit}
              className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-orange-500/30"
            >
              <div className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="NAME *"
                    value={contactFormData.name}
                    onChange={(e) => setContactFormData({ ...contactFormData, name: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-white/90 border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-400"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="EMAIL *"
                    value={contactFormData.email}
                    onChange={(e) => setContactFormData({ ...contactFormData, email: e.target.value })}
                    required
                    className="w-full px-4 py-3 rounded-lg bg-white/90 border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-400"
                  />
                </div>
                <div>
                  <input
                    type="tel"
                    placeholder="PHONE (optional)"
                    value={contactFormData.phone}
                    onChange={(e) => setContactFormData({ ...contactFormData, phone: e.target.value })}
                    className="w-full px-4 py-3 rounded-lg bg-white/90 border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-400"
                  />
                </div>
                <div>
                  <textarea
                    placeholder="YOUR GOAL OR MESSAGE * (e.g. I have a wedding in June and want to feel confident)"
                    value={contactFormData.message}
                    onChange={(e) => setContactFormData({ ...contactFormData, message: e.target.value })}
                    required
                    rows={4}
                    className="w-full px-4 py-3 rounded-lg bg-white/90 border border-gray-200 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent placeholder-gray-400 resize-none"
                  />
                </div>
              </div>
              {contactFormStatus === "error" && (
                <p className="text-red-400 text-sm mt-3 text-center">Something went wrong. Please try again or email amarsbody@gmail.com.</p>
              )}
              <button
                type="submit"
                disabled={contactFormStatus === "loading"}
                className="w-full mt-5 bg-orange-500 text-white font-bold py-4 px-12 rounded-full text-lg hover:bg-orange-400 transition-all transform hover:scale-[1.02] disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {contactFormStatus === "loading" ? "SENDING..." : "SEND MESSAGE →"}
              </button>
              <p className="text-gray-500 text-sm mt-3">Or email directly: <a href="mailto:amarsbody@gmail.com" className="text-orange-400 hover:text-orange-300">amarsbody@gmail.com</a></p>
            </form>
          )}
        </div>
      </section>

      {/* Google Reviews Link */}
      <section className="py-16 px-6 bg-gray-50 border-t border-gray-200">
        <div className="max-w-2xl mx-auto text-center">
          <p className="text-gray-600 mb-6">Have you trained with me? Share your experience!</p>
          <a
            href="https://g.page/r/CQO0WubS7G7REAI/review"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-orange-500 text-white font-bold px-8 py-3 rounded-full hover:bg-orange-600 transition-all"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
            Leave a Google Review
          </a>
        </div>
      </section>

      <footer className="py-8 px-6 pb-20 bg-gray-950 border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xl font-extrabold">
            <span className="text-gray-700">A</span>
            <span className="text-orange-600">Mars</span>
            <span className="text-gray-700">Body</span>
          </div>
          <p className="text-gray-500 text-sm">© 2026 AMarsBody. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
