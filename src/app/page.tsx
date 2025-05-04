/*
"use client"
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, ChevronRight, MessageCircle, Users } from 'lucide-react';
import { AnimatedGridPattern } from '@/components/ui/flickeringgrid';
import { cn } from '@/lib/utils';

export default function Home() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#080010] overflow-hidden relative p-8 md:p-16 ">
      

      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-[#0c0014] to-[#120029] z-0"></div>
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-700/10 blur-3xl rounded-full"></div>
      <div className="absolute bottom-1/4 left-1/3 w-64 h-64 bg-indigo-700/10 blur-3xl rounded-full"></div>
      
   
      <div className="absolute top-0 right-0 w-[1px] h-screen bg-purple-700/20 transform rotate-[15deg] origin-top-right"></div>
      <div className="absolute top-0 right-1/4 w-[1px] h-screen bg-indigo-700/10 transform rotate-[25deg] origin-top-right"></div>
      <div className="absolute bottom-0 left-0 w-screen h-[1px] bg-purple-700/20 transform rotate-[15deg] origin-bottom-left"></div>
      
    
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 80 }).map((_, i) => (
          <div 
            key={i} 
            className="absolute bg-white rounded-full animate-pulse"
            style={{
              width: Math.random() * 2 + 1 + 'px',
              height: Math.random() * 2 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.7,
              animationDuration: (Math.random() * 8 + 2) + 's'
            }}
          ></div>
        ))}
      </div>
      

      <section className="relative z-10 pb-20 pt-12 md:pt-16 px-4 md:px-12">
    
        <div className="container mx-auto">
        
          <div className="flex flex-col lg:flex-row items-center">
         
            <div className="lg:w-1/2 mb-16 lg:mb-0">
          
           
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-black/60 border border-green-400/40 text-white text-sm font-medium mb-6 backdrop-blur-sm shadow-lg shadow-green-900/20">
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                Available for Early Access
              </div>
               
         
              <h1 className="text-5xl md:text-6xl font-bold text-white leading-tight mb-5">
                Transform Trading <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-purple-400 to-indigo-300">simulations</span> <br/>
                with us!
              </h1>
              
              <p className="text-xl text-gray-300 mb-10 max-w-xl">
                {mounted ? 
                  "We're your partner in advanced trading simulations, with thousands of AI agents that have unique personalities and strategies interacting in a simulated Solana environment." : 
                  "Loading..."}
              </p>

              <div className="flex flex-wrap gap-4">
                <Link href="/monitoring" className="flex items-center justify-center px-8 py-4 rounded-lg bg-white text-black font-medium hover:from-purple-600 hover:to-indigo-600 transition-all group shadow-lg shadow-purple-900/30">
                  View Simulation
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/agent-dashboard" className="flex items-center justify-center px-8 py-4 rounded-lg bg-black/40 backdrop-blur-md border border-purple-500/30 text-white font-medium hover:bg-black/60 hover:border-purple-500/50 transition-all shadow-lg shadow-purple-900/20">
                  Our Work
                </Link>
              </div>
            </div>

            <div className="lg:w-1/2 relative">
          
              <div className="relative w-full h-[500px]">
              <AnimatedGridPattern numSquares={50}
        maxOpacity={0.1}
        duration={6}
        repeatDelay={1}
        className={cn(
          "[mask-image:radial-gradient(500px_circle_at_center,white,transparent)]",
          "inset-x-1 inset-y-[-30%] h-[200%] skew-y-12",
        )}></AnimatedGridPattern>
                <img
                  src="/design1.png"
                  alt="Abstract 3D purple shape"
                  className="w-full h-full object-contain drop-shadow-2xl"
                />
                <div className="absolute -inset-10 bg-purple-500/20 blur-3xl rounded-full z-[-1]"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-700/10 to-indigo-700/10 blur-2xl z-[-1]"></div>
              </div>
            </div>
          </div>
        </div>
      </section>


      <section className="py-20 relative z-10">
        <div className="container mx-auto px-6">
          <div className="mb-20">
            <h2 className="text-4xl font-bold text-white mb-4">Platform Features</h2>
            <div className="w-20 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group">
              <div className="h-full border border-purple-900/30 bg-black/60 backdrop-blur-md p-8 rounded-xl transition-all duration-300 hover:cursor-pointer hover:border-purple-500/40 hover:bg-black/80 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-900/20">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-800 to-purple-900 rounded-lg flex items-center justify-center mb-6 group-hover:from-purple-700 group-hover:to-purple-800 transition-colors shadow-lg shadow-purple-900/30">
                  <Users className="text-purple-200 w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Agent Dashboard</h3>
                <p className="text-gray-300 mb-8">Track all simulated traders, their personalities, balances, and activity in a comprehensive dashboard.</p>
                <Link href="/agent-dashboard" className="inline-flex items-center text-purple-300 group-hover:text-purple-400 transition-colors font-medium">
                  Open Dashboard
                  <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
            
            <div className="group">
              <div className="h-full border border-purple-900/30 bg-black/60 backdrop-blur-md p-8 rounded-xl transition-all duration-300 hover:cursor-pointer hover:border-purple-500/40 hover:bg-black/80 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-900/20">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-800 to-purple-900 rounded-lg flex items-center justify-center mb-6 group-hover:from-purple-700 group-hover:to-purple-800 transition-colors shadow-lg shadow-purple-900/30">
                  <BarChart3 className="text-purple-200 w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Simulation Monitoring</h3>
                <p className="text-gray-300 mb-8">Track simulation metrics, view transaction history, and control the autonomous behavior of your trading agents.</p>
                <Link href="/monitoring" className="inline-flex items-center text-purple-300 group-hover:text-purple-400 transition-colors font-medium">
                  View Monitoring
                  <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
            
            <div className="group">
              <div className="h-full border border-purple-900/30 bg-black/60 backdrop-blur-md p-8 rounded-xl transition-all duration-300 hover:cursor-pointer hover:border-purple-500/40 hover:bg-black/80 transform hover:-translate-y-1 hover:shadow-lg hover:shadow-purple-900/20">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-800 to-purple-900 rounded-lg flex items-center justify-center mb-6 group-hover:from-purple-700 group-hover:to-purple-800 transition-colors shadow-lg shadow-purple-900/30">
                  <MessageCircle className="text-purple-200 w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Real-time Chat</h3>
                <p className="text-gray-300 mb-8">Observe how agents interact, share trading ideas, and influence each other in real-time.</p>
                <Link href="/monitoring" className="inline-flex items-center text-purple-300 group-hover:text-purple-400 transition-colors font-medium">
                  View Chat
                  <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
      
   
      <footer className="py-10 border-t border-purple-900/30 mt-12 relative z-10 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-8 md:mb-0">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 mr-2"></div>
              <span className="text-xl font-bold text-white">
                NeuralTraders
              </span>
            </div>
            
            <div className="text-gray-400 text-sm">
              © {new Date().getFullYear()} NeuralTraders. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
  */
 "use client"
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, BarChart3, ChevronRight, MessageCircle, Users, Star, Zap, Sparkles } from 'lucide-react';
import { AnimatedGridPattern } from '@/components/ui/flickeringgrid';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface Delay{
  delay:number
}


const GlowingParticle = ({ delay }:Delay) => {
  return (
    <motion.div
      className="absolute rounded-full bg-white"
      initial={{ opacity: 0, scale: 1 }}
      animate={{ 
        opacity: [0, 0.7, 0], 
        scale: [0, 1, 0],
        x: [0, Math.random() * 50 - 25],
        y: [0, Math.random() * 50 - 25],
      }}
      transition={{ 
        duration: Math.random() * 5 + 5, 
        repeat: Infinity, 
        delay: delay,
        ease: "easeInOut" 
      }}
      style={{
        width: Math.random() * 3 + 1 + 'px',
        height: Math.random() * 3 + 1 + 'px',
      }}
    />
  );
};

interface Featue{
  icon:any,
  title:string,
  description:string,
  linkText:string,
  href:string
}

const FeatureCard = ({ icon: Icon, title, description, linkText, href }:Featue) => {
  return (
    <motion.div 
      className="group relative"
      whileHover={{ y: -8, transition: { duration: 0.3 } }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
    >
      <div className="absolute -inset-1 bg-gradient-to-r from-purple-600/20 via-fuchsia-500/20 to-indigo-600/20 rounded-xl blur opacity-50 group-hover:opacity-75 transition duration-500"></div>
      <div className="h-full border border-purple-900/40 bg-black/70 backdrop-blur-md p-8 rounded-xl transition-all duration-300 relative z-10 overflow-hidden shadow-xl">
        <div className="absolute right-0 top-0 h-full w-1/4 bg-gradient-to-l from-purple-500/10 to-transparent"></div>
        <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-purple-500/10 blur-2xl rounded-full"></div>
        
        <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-fuchsia-700 rounded-lg flex items-center justify-center mb-6 group-hover:from-purple-500 group-hover:to-fuchsia-600 transition-colors shadow-lg shadow-purple-900/40">
          <Icon className="text-white w-7 h-7" />
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-3">{title}</h3>
        <p className="text-gray-300 mb-8 text-lg">{description}</p>
        
        <Link href={href} className="inline-flex items-center py-2 px-4 rounded-lg bg-purple-900/30 text-purple-200 group-hover:bg-purple-800/50 group-hover:text-white transition-all font-medium">
          {linkText}
          <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>
    </motion.div>
  );
};

export default function Home() {
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    setMounted(true);
  }, []);

  const variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  const statsVariants = {
    hidden: { opacity: 0, scale: 0.9 },
    visible: { 
      opacity: 1, 
      scale: 1,
      transition: { 
        delayChildren: 0.3,
        staggerChildren: 0.2
      }
    }
  };

  const statItemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="min-h-screen bg-[#050008] overflow-hidden relative p-12">
      {/* Background elements */}
      <div className="absolute top-0 left-0 w-full h-full">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-radial from-[#14082f] via-[#0c0020] to-[#050008] opacity-80 z-0"></div>
        <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-700/20 blur-[100px] rounded-full"></div>
        <div className="absolute bottom-1/4 left-1/3 w-96 h-96 bg-indigo-700/20 blur-[100px] rounded-full"></div>
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-fuchsia-700/20 blur-[100px] rounded-full"></div>
        
        {/* Grid lines */}
        <div className="absolute inset-0">
          <div className="absolute top-0 right-0 w-[1px] h-screen bg-purple-700/30 transform rotate-[15deg] origin-top-right"></div>
          <div className="absolute top-0 right-1/3 w-[1px] h-screen bg-indigo-700/20 transform rotate-[25deg] origin-top-right"></div>
          <div className="absolute bottom-0 left-0 w-screen h-[1px] bg-purple-700/30 transform rotate-[3deg] origin-bottom-left"></div>
          <div className="absolute top-1/2 left-0 w-screen h-[1px] bg-indigo-700/20 transform rotate-[-3deg] origin-center-left"></div>
        </div>
        
        {/* Particles */}
        <div className="absolute inset-0 overflow-hidden">
          {Array.from({ length: 20 }).map((_, i) => (
            <div key={i} className="absolute" style={{
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
            }}>
              <GlowingParticle delay={i * 0.2} />
            </div>
          ))}
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative z-10 pt-24 pb-20 px-6 md:px-16">
        <div className="container mx-auto">
          <motion.div 
            className="flex flex-col lg:flex-row items-center"
            initial="hidden"
            animate="visible"
            variants={variants}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <div className="lg:w-1/2 mb-16 lg:mb-0">
              <motion.div 
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="inline-flex items-center px-5 py-2 rounded-full bg-gradient-to-r from-purple-900/80 to-indigo-900/80 border border-purple-400/30 text-white text-sm font-medium mb-8 backdrop-blur-sm shadow-lg shadow-purple-900/30"
              >
                <span className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-300 rounded-full mr-3 animate-pulse"></span>
                Now Available for Early Access
              </motion.div>
              
              <motion.h1 
                className="text-6xl md:text-7xl font-bold mb-6 leading-tight"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
              >
                <span className="text-white">Transform </span>
                <span className="relative">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-300 via-fuchsia-300 to-indigo-400">
                    Trading
                  </span>
                  <span className="absolute -bottom-1 left-0 w-full h-[3px] bg-gradient-to-r from-purple-500 via-fuchsia-500 to-indigo-500"></span>
                </span>
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-fuchsia-400 to-indigo-300">
                  Simulations
                </span>
              </motion.h1>
              
              <motion.p 
                className="text-xl md:text-2xl text-gray-300 mb-10 max-w-xl leading-relaxed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                {mounted ? 
                  "Experience the future of trading with thousands of AI agents that have unique personalities and strategies interacting in a simulated Solana environment." : 
                  "Loading..."}
              </motion.p>

              <motion.div 
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.7 }}
              >
                <Link href="/monitoring" className="relative group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-fuchsia-600 rounded-lg blur opacity-70 group-hover:opacity-100 transition duration-300 group-hover:duration-200 animate-pulse-slow"></div>
                  <button className="relative flex items-center justify-center px-8 py-4 rounded-lg bg-black text-white font-medium transition-all group-hover:bg-black/80">
                    View Simulation
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </Link>
                
                <Link href="/agent-dashboard" className="flex items-center justify-center px-8 py-4 rounded-lg bg-white/5 backdrop-blur-md border border-purple-500/30 text-white font-medium hover:bg-white/10 hover:border-purple-500/50 transition-all shadow-lg shadow-purple-900/20">
                  Our Work
                  <Sparkles className="ml-2 w-4 h-4 text-purple-400" />
                </Link>
              </motion.div>
            </div>

            <div className="lg:w-1/2 relative">
              <motion.div 
                className="relative w-full h-[550px]"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1, delay: 0.6 }}
              >
                <AnimatedGridPattern 
                  numSquares={60}
                  maxOpacity={0.15}
                  duration={8}
                  repeatDelay={1}
                  className={cn(
                    "[mask-image:radial-gradient(600px_circle_at_center,white,transparent)]",
                    "inset-x-1 inset-y-[-30%] h-[200%] skew-y-12",
                  )}
                />
                
                <motion.div
                  className="absolute inset-0 flex items-center justify-center"
                  animate={{ 
                    rotateZ: [0, 2, 0, -2, 0],
                    y: [0, -10, 0, 10, 0]
                  }}
                  transition={{ 
                    duration: 10,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <img
                    src="/design1.png"
                    alt="Abstract 3D purple shape"
                    className="w-full h-full object-contain drop-shadow-2xl"
                  />
                </motion.div>
                
                <div className="absolute -inset-10 bg-purple-500/30 blur-[100px] rounded-full z-[-1]"></div>
                <div className="absolute inset-0 bg-gradient-to-tr from-purple-700/10 to-indigo-700/10 blur-3xl z-[-1]"></div>
                
                {/* Floating elements */}
                <motion.div 
                  className="absolute -right-12 top-20 w-24 h-24 rounded-xl bg-gradient-to-br from-purple-600/20 to-fuchsia-600/20 backdrop-blur-md border border-purple-500/20"
                  animate={{ 
                    y: [0, 15, 0],
                    rotate: [0, 5, 0]
                  }}
                  transition={{ 
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="w-10 h-10 text-purple-300" />
                  </div>
                </motion.div>
                
                <motion.div 
                  className="absolute -left-8 bottom-32 w-16 h-16 rounded-full bg-gradient-to-br from-indigo-600/20 to-fuchsia-600/20 backdrop-blur-md border border-indigo-500/20"
                  animate={{ 
                    y: [0, -10, 0],
                    x: [0, 5, 0]
                  }}
                  transition={{ 
                    duration: 5,
                    delay: 1,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Star className="w-6 h-6 text-indigo-300" />
                  </div>
                </motion.div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <motion.section 
        className="py-12 relative z-10"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={statsVariants}
      >
        <div className="container mx-auto px-6">
          <div className="rounded-2xl bg-gradient-to-r from-purple-900/20 via-fuchsia-900/20 to-indigo-900/20 border border-purple-500/20 p-2">
            <div className="bg-black/40 backdrop-blur-xl rounded-xl p-6 md:p-8">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                <motion.div variants={statItemVariants} className="text-center">
                  <p className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-purple-500 mb-2">5000+</p>
                  <p className="text-gray-400">AI Agents</p>
                </motion.div>
                
                <motion.div variants={statItemVariants} className="text-center">
                  <p className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-fuchsia-300 to-fuchsia-500 mb-2">24/7</p>
                  <p className="text-gray-400">Real-time Trading</p>
                </motion.div>
                
                <motion.div variants={statItemVariants} className="text-center">
                  <p className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-indigo-500 mb-2">150+</p>
                  <p className="text-gray-400">Trading Strategies</p>
                </motion.div>
                
                <motion.div variants={statItemVariants} className="text-center">
                  <p className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-400 mb-2">99.9%</p>
                  <p className="text-gray-400">Uptime</p>
                </motion.div>
              </div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section className="py-20 relative z-10">
        <div className="container mx-auto px-6">
          <motion.div 
            className="mb-16 text-center"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">Cutting-Edge Features</h2>
            <div className="w-24 h-1 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full mx-auto mb-6"></div>
            <p className="text-gray-300 text-lg max-w-2xl mx-auto">Unlock the power of our advanced trading simulation platform with these exceptional features</p>
          </motion.div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={Users}
              title="Agent Dashboard"
              description="Track all simulated traders, their personalities, balances, and activity in a comprehensive dashboard."
              linkText="Open Dashboard"
              href="/agent-dashboard"
            />
            
            <FeatureCard 
              icon={BarChart3}
              title="Simulation Monitoring"
              description="Track simulation metrics, view transaction history, and control the autonomous behavior of your trading agents."
              linkText="View Monitoring"
              href="/monitoring"
            />
            
            <FeatureCard 
              icon={MessageCircle}
              title="Real-time Chat"
              description="Observe how agents interact, share trading ideas, and influence each other in real-time with natural language conversations."
              linkText="View Chat"
              href="/monitoring"
            />
          </div>
        </div>
      </section>
      
    
      
     
      <footer className="py-10 border-t border-purple-900/30 mt-12 relative z-10 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-8 md:mb-0">
              <div className="w-3 h-3 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 mr-2"></div>
              <span className="text-xl font-bold text-white">
                NeuralTraders
              </span>
            </div>
            
          
            
            <div className="text-gray-400 text-sm">
              © {new Date().getFullYear()} NeuralTraders. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}