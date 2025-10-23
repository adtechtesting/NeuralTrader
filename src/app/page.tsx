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
export default function Home() {
  const [mounted, setMounted] = useState(true);
   const router=useRouter();
  return (
    <div className="min-h-screen w-full relative text-white overflow-hidden bg-black">
      {/* Hero Section */}
      <section className="min-h-screen relative">
        <Spotlight />
        
        {/* Top Left Blurred Circle - SMALLER */}
        <div className="absolute top-0 -left-20 w-72 h-72 rounded-full bg-white opacity-5 blur-[120px] pointer-events-none" />

        {/* Bottom Right Blurred Circle - SMALLER */}
        <div className="absolute bottom-40 -right-32 w-72 h-72 rounded-full bg-white opacity-5 blur-[120px] pointer-events-none" />

        {/* Top Grid Background */}
        <div
          className="absolute inset-0 z-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, #1A1A1A 1px, transparent 1px),
              linear-gradient(to bottom, #1A1A1A 1px, transparent 1px)
            `,
            backgroundSize: "80px 80px",
            WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 30%, #000 40%, transparent 100%)",
            maskImage: "radial-gradient(ellipse 80% 80% at 50% 30%, #000 40%, transparent 100%)",
          }}
        />

        {/* Bottom Glow with Stars */}
        <div className="absolute -bottom-80 left-1/2 -translate-x-1/2 min-w-screen h-[800px] pointer-events-none">
          <div
            className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-[73%] min-w-[3000px] h-[3000px] rounded-full"
            style={{
              backgroundColor: 'black',
              boxShadow: 'inset 0 0 100px 20px rgba(255, 255, 255, 0.05), inset 0 0 200px 50px rgba(255, 255, 255, 0.08)',
              backgroundImage: "radial-gradient(white 1px, transparent 1px), radial-gradient(white 1px, transparent 1px)",
              backgroundSize: "100px 100px, 100px 100px",
              backgroundPosition: "0 0, 25px 25px",
            }}
          />
        </div>

        {/* Hero Content - REDUCED BOTTOM PADDING */}
        <div className="relative z-10 flex flex-col items-center text-center pt-32 px-6 pb-8">
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
              "Experience the future of trading with thousands of AI agents that have unique personalities and strategies interacting in a simulated Solana environment." : 
              "Loading..."}
          </p>

          <div className="flex flex-wrap gap-4 justify-center">
            <button onClick={()=> {
router.push("/token-setup")
            }} className="bg-white text-black px-8 py-4 rounded-full font-medium hover:bg-white/90 transition-all duration-300 transform flex items-center hover:cursor-pointer">
              Start Trading Simulation
              <ArrowRight className="ml-2 w-5 h-5" />
            </button>

            <button className="bg-white/5 backdrop-blur-md border border-white/10 px-8 py-4 rounded-full font-medium hover:bg-white/10 transition-all duration-300 flex items-center">
             Create Agent
            </button>
          </div>
      
        </div>
      </section>
   
      {/* Logo Ticker - REDUCED TOP MARGIN */}
      <div className="relative z-20 -mt-12">
        <LogoTicker />
      </div>

      {/* Product Showcase Section */}
       
      {/* Features Section - Separate background */}
     <FeaturesSection></FeaturesSection>

     <FAQsSection></FAQsSection>

    
    </div>
  );
}




type FeatureProps = {
  title: string;
  description: string;
 
 
}
 function FeatureCard({ title, description}: FeatureProps) {
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
  }, []);

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
          <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Cutting-Edge Features
          </h2>
          <p className="text-white/50 text-lg md:text-xl max-w-2xl mx-auto">
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
        <>
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

        </>
    )
}
