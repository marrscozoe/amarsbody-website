"use client";

import { useState, useEffect, useRef } from "react";

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
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

  const whoItForItems = [
    { icon: "✨", text: "Brides wanting to look amazing for their wedding" },
    { icon: "🏖️", text: "Anyone preparing for beach vacations or trips" },
    { icon: "👗", text: "People with reunions or big events coming up" },
    { icon: "💪", text: "Anyone tired of fad diets and quick fixes" },
    { icon: "📈", text: "Professionals who want sustainable results" },
    { icon: "🌟", text: "Anyone who wants to feel confident in their body" },
  ];

  return (
    <main className="min-h-screen bg-gray-50">
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-white border-b border-gray-200 shadow-md py-3" : "py-4 bg-transparent"}`}>
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center">
          <a href="#" className="flex items-center gap-2">
            <img src="/logo.svg" alt="AMarsBody" className="h-12" />
          </a>
          <div className="flex gap-6 text-sm font-medium text-gray-700">
            <a href="#programs" className="hover:text-orange-500 transition-colors">PROGRAMS</a>
            <a href="#services" className="hover:text-orange-500 transition-colors">SERVICES</a>
            <a href="#about" className="hover:text-orange-500 transition-colors">ABOUT</a>
            <a href="#contact" className="hover:text-orange-500 transition-colors">CONTACT</a>
          </div>
          <a href="#contact" className="bg-orange-500 text-gray-100 font-bold px-5 py-2 rounded-full text-sm hover:bg-orange-600 transition-all">
            START NOW
          </a>
        </div>
      </nav>

      <section className="relative h-screen flex pt-24 items-center justify-center overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-orange-900/40 via-gray-900 to-gray-900" />
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        </div>
        
        <div className="relative z-10 text-center px-6 max-w-5xl">
          <h1 className="text-6xl md:text-8xl font-extrabold mb-6 leading-tight tracking-tight">
            <span className="text-white drop-shadow-lg">BUILD YOUR</span>
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-500">
              DREAM BODY
            </span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Custom training and nutrition programs designed for your goals. No gimmicks. Just results.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="#contact" className="bg-orange-500 text-gray-100 font-bold py-3 px-10 rounded-full hover:bg-orange-400 transition-all transform hover:scale-105 hover:shadow-[0_0_30px_rgba(249,115,22,0.4)]">
              GET STARTED
            </a>
            <a href="#programs" className="border border-white/30 text-gray-100 font-semibold py-3 px-10 rounded-full hover:bg-white/10 transition-all">
              VIEW PROGRAMS
            </a>
          </div>
        </div>
      </section>

      <section className="py-16 bg-gray-900 border-y border-gray-800">
        <div className="max-w-6xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-extrabold text-orange-500 mb-2">500+</div>
            <div className="text-gray-400 text-sm">Clients Transformed</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-extrabold text-orange-500 mb-2">15+</div>
            <div className="text-gray-400 text-sm">Years Experience</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-extrabold text-orange-500 mb-2">95%</div>
            <div className="text-gray-400 text-sm">Goal Achievement</div>
          </div>
          <div className="text-center">
            <div className="text-4xl md:text-5xl font-extrabold text-orange-500 mb-2">24/7</div>
            <div className="text-gray-400 text-sm">Support</div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-gray-900 overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 mb-10 text-center">
          <h2 className="text-4xl font-bold mb-4">
            <span className="text-gray-100">WHO THIS IS </span>
            <span className="text-orange-400">FOR</span>
          </h2>
          <p className="text-gray-400">You put in the work. You just need a plan that works.</p>
        </div>
        
        <div ref={scrollRef} className="flex overflow-x-auto gap-6 px-6 pb-8 scrollbar-hide" style={{ WebkitOverflowScrolling: 'touch' }}>
          {[...whoItForItems, ...whoItForItems].map((item, index) => (
            <div key={index} className="flex-shrink-0 w-72 bg-gray-800 border border-gray-700 rounded-2xl p-6 text-center hover:border-orange-500/50 hover:shadow-xl transition-all cursor-pointer">
              <div className="w-16 h-16 mx-auto rounded-full bg-orange-500/20 flex items-center justify-center mb-4">
                <span className="text-2xl">{item.icon}</span>
              </div>
              <p className="text-gray-200 font-medium">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="programs" className="py-32 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold mb-4 text-center">
            <span className="text-gray-900">TRAINING </span>
            <span className="text-orange-600">PROGRAMS</span>
          </h2>
          <p className="text-gray-600 text-center mb-20 max-w-xl mx-auto">Structured programs designed around YOUR goals and timeline.</p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group bg-white border border-gray-200 rounded-3xl p-8 hover:border-orange-300 hover:shadow-xl transition-all duration-300 hover:-translate-y-2">
              
              <h3 className="text-2xl font-bold mb-4 text-gray-900 group-hover:text-orange-600 transition-colors">SHRED</h3>
              <p className="text-gray-600 mb-6 leading-relaxed">Fat loss program combining strength training and cardio intervals to torch fat while preserving muscle.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-700"><span className="text-orange-600">✓</span> Fat loss focused</li>
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
        </div>
      </section>

      <section id="services" className="py-32 px-6 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold mb-4 text-center">
            <span className="text-gray-100">WHAT I </span>
            <span className="text-orange-400">DO</span>
          </h2>
          <p className="text-gray-400 text-center mb-20 max-w-xl mx-auto">Full-service training and nutrition coaching.</p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group bg-gray-800 border border-gray-700 rounded-3xl p-8 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="text-5xl mb-6">💪</div>
              <h3 className="text-2xl font-bold mb-4 text-gray-100 group-hover:text-orange-400 transition-colors">Personal Training</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">One-on-one sessions tailored to YOUR goals. Build strength and transform your body.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-orange-400">✓</span> Custom workouts</li>
                <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-orange-400">✓</span> Form correction</li>
                <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-orange-400">✓</span> Progress tracking</li>
              </ul>
            </div>
            
            <div className="group bg-gray-800 border border-gray-700 rounded-3xl p-8 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="text-5xl mb-6">🥗</div>
              <h3 className="text-2xl font-bold mb-4 text-gray-100 group-hover:text-orange-400 transition-colors">Nutrition Coaching</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">Eat to support your goals. No starvation — just proper nutrition that fits your life.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-orange-400">✓</span> Custom meal plans</li>
                <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-orange-400">✓</span> Macro tracking</li>
                <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-orange-400">✓</span> Habit building</li>
              </ul>
            </div>
            
            <div className="group bg-gray-800 border border-gray-700 rounded-3xl p-8 hover:border-orange-500/50 transition-all duration-300 hover:-translate-y-2">
              <div className="text-5xl mb-6">🎯</div>
              <h3 className="text-2xl font-bold mb-4 text-gray-100 group-hover:text-orange-400 transition-colors">Online Coaching</h3>
              <p className="text-gray-400 mb-6 leading-relaxed">Train anywhere. Personalized programming with weekly check-ins.</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-orange-400">✓</span> Remote training</li>
                <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-orange-400">✓</span> Video analysis</li>
                <li className="flex items-center gap-2 text-sm text-gray-300"><span className="text-orange-400">✓</span> Online support</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="about" className="py-32 px-6 bg-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-5xl font-bold mb-6">
                <span className="text-gray-100">ABOUT </span>
                <span className="text-orange-400">ME</span>
              </h2>
              <p className="text-xl text-gray-300 mb-6 leading-relaxed">
                I'm Allen — personal trainer specializing in nutrition and fat loss. I help people get in the best shape of their lives.
              </p>
              <p className="text-gray-400 mb-6 leading-relaxed">
                I'm a husband and proud dad of 2 sons. When I'm not training, I love camping, building stuff, and tinkering with tech. I believe in making fitness fit your life — not the other way around.
              </p>
              <p className="text-gray-400 mb-8 leading-relaxed">
                I focus on what matters: helping you hit your goals with real food, real training, and accountability.
              </p>
              <div className="flex flex-wrap gap-4">
                <div className="bg-orange-900/30 border border-orange-500/30 rounded-xl px-6 py-3">
                  <div className="text-2xl font-bold text-orange-400">Uptown Dallas</div>
                  <div className="text-sm text-gray-400">Based</div>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl px-6 py-3">
                  <div className="text-2xl font-bold text-gray-100">15+ Years</div>
                  <div className="text-sm text-gray-400">Experience</div>
                </div>
                <div className="bg-gray-800 border border-gray-700 rounded-xl px-6 py-3">
                  <div className="text-2xl font-bold text-gray-100">Cooper Inst.</div>
                  <div className="text-sm text-gray-400">Certified</div>
                </div>
              </div>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-gray-800/20 rounded-3xl blur-3xl"></div>
              <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700 mb-6">
                {/* Family Photo */}
                <img src="/family-photo.jpg" alt="Allen and family" className="w-full h-64 object-cover rounded-2xl mb-4" />
                <p className="text-center text-gray-400 text-sm">My family — the reason I do what I do</p>
              </div>
              <div className="relative bg-gradient-to-br from-gray-800 to-gray-900 rounded-3xl p-8 border border-gray-700">
                <h3 className="text-2xl font-bold mb-6 text-orange-400">Credentials</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-700">
                    <span className="text-gray-400">Certification</span>
                    <span className="font-semibold text-gray-100">Cooper Institute for Aerobics Research</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-700">
                    <span className="text-gray-400">Specialty</span>
                    <span className="font-semibold text-gray-100">Fat Loss + Nutrition</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-700">
                    <span className="text-gray-400">Training</span>
                    <span className="font-semibold text-gray-100">In-person</span>
                    <span className="font-semibold text-gray-100">Online</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-700">
                    <span className="text-gray-400">Nutrition</span>
                    <span className="font-semibold text-gray-100">In-person</span>
                    <span className="font-semibold text-gray-100">Online</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-32 px-6 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-5xl font-bold mb-4 text-center">
            <span className="text-gray-900">CLIENT </span>
            <span className="text-orange-600">RESULTS</span>
          </h2>
          <p className="text-gray-600 text-center mb-20">Real results from real clients.</p>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white border border-gray-200 rounded-3xl p-8">
              <div className="flex gap-1 mb-4">
                {[1,2,3,4,5].map(i => <span key={i} className="text-orange-500">★</span>)}
              </div>
              <p className="text-gray-700 mb-6 italic">"Lost 25 lbs in 12 weeks. Best decision I ever made. No gimmicks, just hard work and a solid plan."</p>
              <div className="font-semibold text-gray-900">— Danielle P.</div>
              <div className="text-sm text-gray-500">SHRED Program</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-3xl p-8">
              <div className="flex gap-1 mb-4">
                {[1,2,3,4,5].map(i => <span key={i} className="text-orange-500">★</span>)}
              </div>
              <p className="text-gray-700 mb-6 italic">"Finally understand nutrition. Down 18 lbs and keeping it off. Life changer."</p>
              <div className="font-semibold text-gray-900">— Blake B.</div>
              <div className="text-sm text-gray-500">MUSCLE Program</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-3xl p-8">
              <div className="flex gap-1 mb-4">
                {[1,2,3,4,5].map(i => <span key={i} className="text-orange-500">★</span>)}
              </div>
              <p className="text-gray-700 mb-6 italic">"Gained 5 lbs of muscle in 1 month. Stronger than I've ever been."</p>
              <div className="font-semibold text-gray-900">— Michelle D.</div>
              <div className="text-sm text-gray-500">STRENGTH Program</div>
            </div>
          </div>
        </div>
      </section>

      <section id="contact" className="py-32 px-6 bg-gray-900 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-orange-900/20 via-gray-900 to-gray-900"></div>
        <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(249,115,22,0.1) 0%, transparent 50%)' }}></div>
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <h2 className="text-5xl md:text-6xl font-bold mb-6">
            <span className="text-gray-100">READY TO </span>
            <span className="text-orange-400">START?</span>
          </h2>
          <p className="text-xl text-gray-400 mb-10">Email me directly and I'll get back to you within 1 business day.</p>
          
          <a href="mailto:marrsco.zoe@gmail.com?subject=AMarsBody Inquiry" className="inline-block bg-orange-500 text-gray-100 font-bold py-4 px-12 rounded-full text-lg hover:bg-orange-400 transition-all transform hover:scale-[1.02] hover:shadow-[0_0_40px_rgba(249,115,22,0.5)]">
            EMAIL ME
          </a>
        </div>
      </section>

      <footer className="py-8 px-6 bg-gray-950 border-t border-gray-800">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-xl font-extrabold">
            <span className="text-gray-700">AM</span><span className="text-orange-600">ars</span><span className="text-gray-700">Body</span>
          </div>
          <p className="text-gray-500 text-sm">© 2026 AMarsBody. All rights reserved.</p>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-orange-500 transition-colors">Instagram</a>
            <a href="#" className="hover:text-orange-500 transition-colors">YouTube</a>
          </div>
        </div>
      </footer>
    </main>
  );
}
