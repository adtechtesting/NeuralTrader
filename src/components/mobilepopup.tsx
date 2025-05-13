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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-purple-900 text-white p-6 rounded-xl max-w-sm mx-auto shadow-lg text-center border border-purple-400">
        <h2 className="text-xl font-semibold mb-2">🔍 Built for Desktop</h2>
        <p className="text-sm text-gray-300">
          This interface is optimized for desktop. Please use a larger screen for the best experience.
        </p>
      </div>
    </div>
  );
}
