"use client"
import { useEffect, useState } from "react";

export default function MobilePopupWarning() {
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      setShowPopup(isMobile);
    };

    handleResize(); // check on mount
    window.addEventListener("resize", handleResize); // check on resize

    return () => window.removeEventListener("resize", handleResize);
  }, []);


  useEffect(()=>{
    if(showPopup) {
        const timer=setTimeout(()=>{
            setShowPopup(false) 
        },6000)
        return ()=>{clearTimeout(timer)}
    }
  },[showPopup])

  if (!showPopup) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mobile-warning-title"
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-neutral-900 via-neutral-950 to-black text-white shadow-xl shadow-black/60"
      >
        <button
          type="button"
          onClick={() => setShowPopup(false)}
          className="absolute right-3 top-3 rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs font-semibold uppercase tracking-wide text-white/70 transition hover:bg-white/20 hover:text-white"
        >
          Close
        </button>

        <div className="px-6 pb-6 pt-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-3xl">
            🔍
          </div>
          <h2 id="mobile-warning-title" className="text-2xl font-semibold tracking-tight">
            Built for Desktops
          </h2>
          <p className="mt-3 text-sm text-white/80">
            NeuralTrader shines on larger screens. Switch to a desktop or resize your window to unlock the full trading and
            analytics experience.
          </p>
        </div>
      </div>
    </div>
  );
}
