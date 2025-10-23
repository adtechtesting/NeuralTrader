"use client";

import { TokenIcon } from "@web3icons/react";
import { motion } from "framer-motion";

// Use uppercase symbols as per web3icons convention
const tokens = ["BTC", "ETH", "SOL", "DOGE", "BONK", "USDC"];

export function LogoTicker() {
  return (
    <div className="bg-black text-white py-[72px] sm:py-24 relative">
      <div className="container mx-auto px-4">
        <h2 className="text-xl text-center text-white/70 mb-9">
          Trusted by the world's most innovative teams
        </h2>
        <div className="relative flex overflow-hidden before:absolute after:absolute before:h-full after:h-full before:w-20 after:w-20 before:left-0 after:right-0 before:top-0 after:top-0 before:bg-gradient-to-r after:bg-gradient-to-l before:from-black before:to-transparent after:from-black after:to-transparent before:z-10 after:z-10 before:content-[''] after:content-['']">
          <motion.div
            initial={{ translateX: 0 }}
            animate={{ translateX: "-50%" }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="flex gap-16 pr-16 flex-shrink-0"
          >
            {/* First set of tokens */}
            {tokens.map((symbol, index) => (
              <div key={index} className="flex items-center justify-center flex-shrink-0">
                <TokenIcon
                  symbol={symbol}
                  variant="branded"
                  size={48}
                  aria-label={`${symbol} token icon`}
                  className="opacity-70 hover:opacity-100 transition-opacity duration-300"
                />
              </div>
            ))}
            {/* Duplicate for seamless infinite scroll */}
            {tokens.map((symbol, index) => (
              <div key={`copy-${index}`} className="flex items-center justify-center flex-shrink-0">
                <TokenIcon
                  symbol={symbol}
                  variant="branded"
                  size={48}
                  aria-label={`${symbol} token icon`}
                  className="opacity-70 hover:opacity-100 transition-opacity duration-300"
                />
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
