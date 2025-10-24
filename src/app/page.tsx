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
        className="bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-white/90 transition-all duration-300 transform hover:scale-105 flex items-center cursor-pointer"
      >
        Start Trading Simulation
        <ArrowRight className="ml-2 w-5 h-5" />
      </button>

      <button className="bg-white/5 backdrop-blur-md border border-white/10 px-8 py-4 rounded-full font-medium hover:bg-white/10 transition-all duration-300 flex items-center">
        Create Agent
      </button>
    </div>

    {/* Bottom Stats/Info Cards */}
   {/* Social Proof Section */}
<div className="w-full max-w-4xl mt-auto">
  <div className="text-center mb-6">
    <p className="text-sm text-white/40 uppercase tracking-wider font-medium">
      Powered by Industry-Leading Technology
    </p>
  </div>
  <div className="relative group">
    <div className="absolute -inset-1 bg-white/5 rounded-2xl blur opacity-40"></div>
    <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl px-10 py-6">
      <div className="flex items-center justify-center gap-12 flex-wrap">
        {/* Trump */}
        <div className="flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
          <img 
            src="/trump.jpeg" 
            alt="Trump" 
            className="h-10 w-10 rounded-full object-cover grayscale hover:grayscale-0 transition-all" 
          />
        </div>
        
        {/* Jupiter */}
        <div className="flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
          <img 
            src="/jupiter.jpg" 
            alt="Jupiter" 
            className="h-10 w-10 rounded-full object-cover grayscale hover:grayscale-0 transition-all" 
          />
        </div>
        
        {/* Pump */}
        <div className="flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
          <img 
            src="/pump.jpg" 
            alt="Pump" 
            className="h-10 w-10 rounded-full object-cover grayscale hover:grayscale-0 transition-all" 
          />
        </div>
        
        {/* Bonk */}
        <div className="flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity cursor-pointer">
          <img 
            src="/bonk.png" 
            alt="Bonk" 
            className="h-10 w-10 rounded-full object-cover grayscale hover:grayscale-0 transition-all" 
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
   <footer className="relative bg-black py-16 border-t border-white/5">
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
          <a href="#" className="text-white/50 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
          </a>
          <a href="#" className="text-white/50 hover:text-white transition-colors">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/>
            </svg>
          </a>
        </div>
      </div>

      {/* Quick Links */}
      <div>
        <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Product</h3>
        <ul className="space-y-3">
          <li><a href="/token-setup" className="text-white/50 hover:text-white transition-colors text-sm">Token Setup</a></li>
          <li><a href="/monitoring" className="text-white/50 hover:text-white transition-colors text-sm">Simulation</a></li>
          <li><a href="/agent-dashboard" className="text-white/50 hover:text-white transition-colors text-sm">Dashboard</a></li>
          <li><a href="/agent-test" className="text-white/50 hover:text-white transition-colors text-sm">Create Agent</a></li>
        </ul>
      </div>

      {/* Resources */}
      <div>
        <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Resources</h3>
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
        <h3 className="text-2xl font-semibold text-white mb-4">{title}</h3>

        {/* Description */}
        <p className="text-white/60 mb-8 leading-relaxed text-lg">
          {description}
        </p>
      </div>
    </div>
  );
}

const features = [
  {
    title: "Agent Dashboard",
    description: "Track all simulated traders, their personalities, balances, and activity in a comprehensive dashboard.",
  },
  {
    title: "Simulation Monitoring",
    description: "Track simulation metrics, view transaction history, and control the autonomous behavior of your trading agents.",
  },
  {
    title: "Real-time Chat",
    description: "Observe how agents interact, share trading ideas, and influence each other in real-time with natural language conversations.",
  },
  {
    title: "Advanced LLM Agents",
    description: "Experience intelligent agents powered by real LLM tool calling, with personality-driven communication and contextual responses.",
  },
  {
    title: "Multi-LLM Support",
    description: "Choose between OpenAI API for advanced features or local Ollama for cost-effective, private operation.",
  },
  {
    title: "Live Analytics",
    description: "Monitor market sentiment, trading volumes, agent performance, and price movements with real-time analytics.",
  },
];

function FeaturesSection() {
  return (
    <section className="relative bg-black py-[72px] sm:py-32 px-6">
      {/* Gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-zinc-950 to-black opacity-50"></div>
      
      <div className="relative z-10 container mx-auto max-w-7xl">
        {/* Header */}
        <div className="text-center mb-20">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
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
    question: "How do the AI agents make trading decisions?",
    answer:
      "Our AI agents use advanced LLM technology with real tool calling capabilities. They analyze market data, communicate with other agents, and make decisions based on their unique personalities, risk profiles, and trading strategies.",
  },
  {
    question: "Can I customize the simulation parameters?",
    answer:
      "Yes! You can adjust the number of agents, their personality types, simulation speed, and even select different trading tokens. The platform supports both OpenAI API and local Ollama for flexible operation.",
  },
  {
    question: "Is this suitable for learning about trading?",
    answer:
      "Absolutely. NeuralTrader provides a risk-free environment to understand market dynamics, agent behavior, and trading strategies. It's perfect for both beginners and experienced traders looking to test strategies.",
  },
  {
    question: "Do I need to install any software?",
    answer:
      "No installation required. NeuralTrader runs entirely in your browser and works across desktop and mobile devices. Just sign up and start exploring the AI trading simulation!",
  },
  {
    question: "Will my simulation data be shared or stored?",
    answer:
      "Your privacy is protected. All simulation sessions are private by default. You can export or delete your data at any time. We never share data without your explicit consent.",
  },
];

function FAQsSection() {
  return (
    <div className="bg-black text-white bg-gradient-to-b from-black to-zinc-950 py-[72px] sm:py-24">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-5xl font-bold tracking-tight">Frequently Asked Questions</h2>
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