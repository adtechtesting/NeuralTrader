"use client"
import { useState } from 'react';
import { ArrowRight, BarChart3, MessageCircle, Users, Sparkles } from 'lucide-react';
import { LogoTicker } from '@/components/ui/logoticker';
import { Spotlight } from '@/components/ui/spotlight';
import { useEffect, useRef } from "react";
import { motion, useMotionTemplate, useMotionValue } from "framer-motion";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordian"
import {Separator} from "@/components/ui/seperator";
import { useRouter } from 'next/navigation';
import { LightRays } from '@/components/ui/lightrays';

export default function Home() {
  const [mounted, setMounted] = useState(true);
  const router = useRouter();
  const avatars = [
  {
    imageUrl: "https://avatars.githubusercontent.com/u/16860528",
    profileUrl: "https://github.com/dillionverma",
  },
  {
    imageUrl: "https://avatars.githubusercontent.com/u/20110627",
    profileUrl: "https://github.com/tomonarifeehan",
  },
  {
    imageUrl: "https://avatars.githubusercontent.com/u/106103625",
    profileUrl: "https://github.com/BankkRoll",
  },
  {
    imageUrl: "https://avatars.githubusercontent.com/u/59228569",
    profileUrl: "https://github.com/safethecode",
  },
  {
    imageUrl: "https://avatars.githubusercontent.com/u/59442788",
    profileUrl: "https://github.com/sanjay-mali",
  },
  {
    imageUrl: "https://avatars.githubusercontent.com/u/89768406",
    profileUrl: "https://github.com/itsarghyadas",
  },
]


  return (
    <div className="min-h-screen w-full relative text-white overflow-hidden bg-black">
      {/* Hero Section */}
     <section className="min-h-screen relative">
  <Spotlight />
   <LightRays />
  {/* Top Left Blurred Circle */}
  <div className="absolute top-0 -left-20 w-48 h-48 rounded-full bg-white opacity-5 blur-[100px] pointer-events-none" />

  {/* Bottom Right Blurred Circle */}
  <div className="absolute bottom-40 -right-32 w-48 h-48 rounded-full bg-white opacity-5 blur-[100px] pointer-events-none" />

  {/* Enhanced Grid Background - Primary Layer */}
  <div
    className="absolute inset-0 z-0"
    style={{
      backgroundImage: `
        linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
      `,
      backgroundSize: "60px 60px",
      WebkitMaskImage: "radial-gradient(ellipse 100% 80% at 50% 30%, #000 35%, transparent 100%)",
      maskImage: "radial-gradient(ellipse 100% 80% at 50% 30%, #000 35%, transparent 100%)",
    }}
  />

  {/* Enhanced Grid Background - Fine Layer */}
  <div
    className="absolute inset-0 z-0"
    style={{
      backgroundImage: `
        linear-gradient(to right, rgba(255, 255, 255, 0.015) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.015) 1px, transparent 1px)
      `,
      backgroundSize: "20px 20px",
      WebkitMaskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, #000 25%, transparent 85%)",
      maskImage: "radial-gradient(ellipse 90% 70% at 50% 30%, #000 25%, transparent 85%)",
    }}
  />

  {/* Enhanced Bottom Glow with Better Stars */}
  <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-full h-[500px] pointer-events-none">
    <div
      className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-[60%] w-[2000px] h-[2000px] rounded-full"
      style={{
        backgroundColor: 'black',
        boxShadow: `
          inset 0 0 100px 20px rgba(255, 255, 255, 0.035),
          inset 0 0 180px 50px rgba(255, 255, 255, 0.05)
        `,
        backgroundImage: `
          radial-gradient(circle, rgba(255, 255, 255, 0.5) 0.5px, transparent 0.5px),
          radial-gradient(circle, rgba(255, 255, 255, 0.3) 0.5px, transparent 0.5px)
        `,
        backgroundSize: "60px 60px, 60px 60px",
        backgroundPosition: "0 0, 30px 30px",
      }}
    />
  </div>

  {/* Hero Content */}
  <div className="relative z-10 flex flex-col items-center text-center pt-32 px-6 pb-16">
    <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/5 backdrop-blur-sm border border-white/10 text-white/80 text-sm mb-8">
      Interactive Trading Simulations
    </div>

    <h1 className="text-5xl md:text-7xl font-medium leading-tight mb-6 max-w-5xl">
      Revolutionize Trading With
      <br />
      <span className="text-white/60">AI-Powered Simulations</span>
    </h1>

    <p className="text-lg md:text-xl text-white/50 max-w-3xl mb-12 leading-relaxed">
      {mounted ? 
        "Experience the future of trading with thousands of AI agents that have different personalities and strategies interacting in a simulated Solana environment." : 
        "Loading..."}
    </p>

    <div className="flex flex-wrap gap-4 justify-center mb-20">
      <button 
        onClick={() => router.push("/token-setup")} 
        className="bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-white/90 transition-all duration-300 transform  flex items-center cursor-pointer"
      >
        Start Trading Simulation
        <ArrowRight className="ml-2 w-5 h-5" />
      </button>

      <button onClick={()=> router.push("/agent-test")} className="bg-white/5 backdrop-blur-md border border-white/10 px-8 py-4 rounded-full font-medium hover:bg-white/10 transition-all duration-300 flex items-center hover:cursor-pointer">
        Create Agent
      </button>
    </div>

    {/* Bottom Stats/Info Cards */}
   {/* Social Proof Section */}
<div className="w-full max-w-4xl mt-auto">
  <div className="text-center mb-6">
    <p className="text-sm text-white/40 uppercase tracking-wider font-medium">
   Fueled by ASI Agents and Solana’s Live Trading Data
    </p>
  </div>
  <div className="relative group">
    <div className="absolute -inset-1 bg-white/5 rounded-2xl blur opacity-40"></div>
    <div className="relative  px-10 py-6">
      <div className="flex items-center justify-center gap-3 flex-wrap">
        {/* Trump */}
        <div className="flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
          <img 
            src="/trump.jpeg" 
            alt="Trump" 
            className="h-10 w-10 rounded-full object-cover  hover:grayscale-0 transition-all" 
          />
        </div>
        
        {/* Jupiter */}
        <div className="flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
          <img 
            src="/jupiter.jpg" 
            alt="Jupiter" 
            className="h-10 w-10 rounded-full object-cover  hover:grayscale-0 transition-all" 
          />
        </div>
        
        {/* Pump */}
        <div className="flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
          <img 
            src="/pump.jpg" 
            alt="Pump" 
            className="h-10 w-10 rounded-full object-cover  hover:grayscale-0 transition-all" 
          />
        </div>
        
        {/* Bonk */}
        <div className="flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
          <img 
            src="/bonk.png" 
            alt="Bonk" 
            className="h-10 w-10 rounded-full object-cover hover:grayscale-0 transition-all" 
          />
        </div>
      </div>
    </div>
  </div>
</div>


  </div>
</section>


      {/* Logo Ticker */}
      <LogoTicker />

      {/* Features Section */}
      <FeaturesSection />

      {/* FAQs Section */}
      <FAQsSection />

      {/* Footer */}
   <footer className="relative bg-black/90 py-16 border-t-2 border-white/10 ">
  <div className="max-w-7xl mx-auto px-6">
    {/* Main Footer Content */}
    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
      {/* Brand Section */}
      <div className="md:col-span-2">
        <div className="flex items-center gap-2 mb-4">
       
          <span className="text-xl font-bold text-white"> ℕ𝕖𝕦𝕣𝕒𝕝𝕥𝕣𝕒𝕕𝕖𝕣</span>
        </div>
        <p className="text-white/50 text-sm leading-relaxed max-w-md mb-6">
          AI-powered trading simulation platform for Solana. Experience the future of trading with intelligent agents.
        </p>
        <div className="flex items-center gap-4">
          <a href="#" className="text-white/50 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23 3a10.9 10.9 0 01-3.14 1.53 4.48 4.48 0 00-7.86 3v1A10.66 10.66 0 013 4s-4 9 5 13a11.64 11.64 0 01-7 2c9 5 20 0 20-11.5a4.5 4.5 0 00-.08-.83A7.72 7.72 0 0023 3z"></path>
            </svg>
          </a>
          <a href="" className="text-white/50 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
        
        </div>
      </div>

      {/* Quick Links */}
      <div>
      
        <ul className="space-y-3">
          <li><a href="/token-setup" className="text-white/50 hover:text-white transition-colors text-sm">Token Setup</a></li>
          <li><a href="/monitoring" className="text-white/50 hover:text-white transition-colors text-sm">Simulation</a></li>
          <li><a href="/agent-dashboard" className="text-white/50 hover:text-white transition-colors text-sm">Dashboard</a></li>
          <li><a href="/agent-test" className="text-white/50 hover:text-white transition-colors text-sm">Create Agent</a></li>
        </ul>
      </div>

      {/* Resources */}
      <div>
       
        <ul className="space-y-3">
          <li><a href="#" className="text-white/50 hover:text-white transition-colors text-sm">Documentation</a></li>
          <li><a href="#" className="text-white/50 hover:text-white transition-colors text-sm">API Reference</a></li>
          <li><a href="#" className="text-white/50 hover:text-white transition-colors text-sm">Support</a></li>
          <li><a href="#" className="text-white/50 hover:text-white transition-colors text-sm">Terms of Service</a></li>
        </ul>
      </div>
    </div>

    {/* Bottom Bar */}
    <div className="pt-8 border-t border-white/5">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="text-white/40 text-sm">
          © {new Date().getFullYear()} NeuralTrader. All rights reserved.
        </div>
        <div className="flex items-center gap-1 text-white/40 text-sm">
          <span>Built with</span>
          <span className="text-red-400">♡</span>
          <span>by Adtech</span>
        </div>
      </div>
    </div>
  </div>
</footer>

    </div>
  );
}

type FeatureProps = {
  title: string;
  description: string;
}

function FeatureCard({ title, description }: FeatureProps) {
  const offsetX = useMotionValue(-100);
  const offsetY = useMotionValue(-100);
  const maskImage = useMotionTemplate`radial-gradient(120px 120px at ${offsetX}px ${offsetY}px, black, transparent)`;
  const border = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateMousePosition = (event: MouseEvent) => {
      if (!border.current) return;
      const borderRect = border.current.getBoundingClientRect();
      offsetX.set(event.x - borderRect.x);
      offsetY.set(event.y - borderRect.y);
    }
    window.addEventListener('mousemove', updateMousePosition);
    return () => {
      window.removeEventListener('mousemove', updateMousePosition);
    }
  }, [offsetX, offsetY]);

  return (
    <div className="group relative h-full">
      <div className="relative h-full border border-white/20 bg-white/5 backdrop-blur-md p-10 rounded-2xl hover:bg-white/10 transition-all duration-300">
        {/* Animated border on mouse move */}
        <motion.div
          className="absolute inset-0 border-2 border-white/40 rounded-2xl pointer-events-none"
          style={{ 
            maskImage, 
            WebkitMaskImage: maskImage,
          }}
          ref={border}
        />

        {/* Title */}
        <h3 className="text-xl font-semibold text-white mb-4">{title}</h3>

        {/* Description */}
        <p className="text-white/60 mb-8 leading-relaxed text-md">
          {description}
        </p>
      </div>
    </div>
  );
}

const features = [
  {
    title: "100+ Autonomous AI Agents with ASI Integration",
    description: "Powered by ASI Alliance, LangChain, and Groq LLMs with 10 unique personalities—Aggressive, Conservative, Contrarian, Whale, Emotional, Technical, and more. Each agent uses natural language reasoning to analyze markets and make independent trading decisions.",
  },
  {
    title: "Jupiter-Powered Token Selection",
    description: "Select any Solana token via Jupiter API integration. Real market data, live prices, and verified token metadata. Choose from thousands of SPL tokens and watch AI agents trade them in a controlled simulation environment.",
  },
  {
    title: "Agent Social Trading Layer",
    description: "Agents don't trade in silence. They chat, debate strategies, share market analysis, and influence each other before executing trades. Watch FOMO form, FUD spread, and consensus emerge naturally—just like real trading communities on Discord or Twitter.",
  },
  {
    title: "Live AMM Price Discovery & Market Dynamics",
    description: "Agents trade in a real Solana AMM pool with actual liquidity mechanics. Their trades directly impact price—10 agents buy, price pumps; whales dump, market crashes. See DeFi mechanics at scale with slippage, volume tracking, and liquidity distribution.",
  },
  {
    title: "Custom Agent Creation (Coming Soon)",
    description: "Create your own AI trading agents with custom personalities and strategies. Choose from multiple LLM providers (Groq, OpenAI, Anthropic), define risk tolerance, and deploy directly to the simulation. Test your agent's performance against 100+ others in real-time.",
  },
  {
    title: "Real-Time Analytics Dashboard",
    description: "Monitor all 100+ agents simultaneously—individual portfolios, P&L tracking, live chat feed, market sentiment analysis, and transaction logs. WebSocket-powered updates show every trade, every decision, every price movement as it happens.",
  },
];


function FeaturesSection() {
  return (
    <section className="relative bg-black/6 py-[72px] sm:py-32 px-6">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black opacity-50"></div>
      
      <div className="relative z-10 container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-2xl md:text-4xl font-bold text-white mb-6 tracking-tight">
            Cutting-Edge Features
          </h2>
          <p className="text-white/50 text-md md:text-lg max-w-xl mx-auto">
            Unlock the power of our advanced trading simulation platform
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {features.map((feature, index) => (
            <FeatureCard
              key={index}
              title={feature.title}
              description={feature.description}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
const FAQ = [
  {
    question: "How do AI agents make trading decisions?",
    answer:
      "Each agent is powered by Groq's Llama 3.1 with LangChain, and coordinated through ASI’s agent protocols. They analyze market data (price, volume, liquidity), chat to gauge sentiment, and decide to buy, sell, or hold based on personality (Aggressive, Conservative, Contrarian, etc.) and risk tolerance—using natural language reasoning, not hard-coded rules.",
  },
  {
    question: "Can I select any Solana token to simulate?",
    answer:
      "Yes! Use our Jupiter API integration to search and select from thousands of verified Solana SPL tokens. Once selected, we create a custom AMM pool where 100+ AI agents will trade that token in real-time. You can switch tokens anytime to run different simulations.",
  },
  {
    question: "Is this real blockchain or just simulation?",
    answer:
      "It's real Solana blockchain integration with actual AMM pool mechanics. Agent trades execute on-chain transactions that affect real liquidity and price discovery. However, it's an isolated simulation environment—your pool is separate from the real market, allowing you to study AI trading behavior safely.",
  },
  {
    question: "What can I learn from watching the simulation?",
    answer:
      "You'll see how AMM mechanics work (slippage, liquidity, price discovery), how different trading strategies perform, how social sentiment creates FOMO and FUD, and how agent personalities influence market dynamics. It's a risk-free sandbox for understanding DeFi and multi-agent behavior in financial markets.",
  },
  {
    question: "Can I create my own AI trading agent?",
    answer:
      "Yes You can create your own AI trading agent with custom personalities and strategies. Choose from multiple LLM providers (Groq, OpenAI, Anthropic), define risk tolerance, and deploy directly to the simulation. Test your agent's performance against 100+ others in real-time but currently its in dev mode.",
  },
  {
    question: "How many agents can run simultaneously?",
    answer:
      "Our platform currently supports 100+ autonomous AI agents trading simultaneously. We use a hybrid architecture (70% LLM-powered, 30% optimized templates) to maintain fast response times (<500ms) while keeping API costs sustainable for continuous 24/7 operation.",
  },
  {
    question: "Is my data private and secure?",
    answer:
      "Yes. All simulation data (agent states, trades, messages) is stored in your project's PostgreSQL database. You have full control over data retention. The simulation runs in an isolated environment and doesn't affect or access your personal Solana wallet or real funds.",
  },
];



function FAQsSection() {
  return (
    <div className="bg-black/7 text-white bg-gradient-to-b from-black to-zinc-950 py-[72px] sm:py-24">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-4xl font-bold tracking-tight">Frequently Asked Questions</h2>
        <div className="mt-12 max-w-4xl mx-auto text-left">
          <Separator />
          <Accordion type="single" collapsible>
            {FAQ.map((item, index) => (
              <AccordionItem key={index} value={item.question}>
                <AccordionTrigger className="text-md lg:text-lg font-bold">{item.question}</AccordionTrigger>
                <AccordionContent className="text-sm">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </div>
  );
}