"use client"
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowRight, ChevronRight, BarChart3, MessageCircle, Users, Star } from 'lucide-react';
import { AnimatedGridPattern } from '@/components/ui/flickeringgrid';
import { cn } from '@/lib/utils';




export default function Home() {

  const [mounted, setMounted] = useState(false);
  

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-black bg-gradient-to-br from-neutral-950 via-black to-indigo-950 overflow-hidden relative p-16">
        
      <div className="absolute top-0 right-0 w-px h-screen bg-purple-800/20"></div>
      <div className="absolute top-1/3 left-0 w-screen h-px bg-purple-800/20"></div>
      <div className="absolute bottom-1/4 right-0 w-screen h-px bg-purple-800/20"></div>
      
      


      <section className="pt-16 pb-24 relative z-10">
    
     

        <div className="container mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-3/5 mb-16 lg:mb-0">
         
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-purple-900/30 border border-purple-800/30 text-purple-400 text-sm font-medium mb-6">
            
                <span className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></span>
                Available for Early Access
              </div>
        
              <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight mb-6">
                Transform <br/>
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300">trading simulations</span> <br/>
                with us!
              </h1>
              
              <p className="text-xl text-gray-400 mb-10 max-w-xl">
                {mounted ? 
                  "We're your partner in advanced trading simulations, with thousands of AI agents that have unique personalities and strategies interacting in a simulated Solana environment." : 
                  "Loading..."}
              </p>
              
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Link href="/monitoring" className="flex items-center justify-center px-8 py-4 rounded-md bg-white text-[#0c0914] font-medium hover:bg-gray-100 transition-all group">
                  View Simulation
                  <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link href="/our-work" className="flex items-center justify-center px-8 py-4 rounded-md bg-transparent border border-gray-700 text-white font-medium hover:bg-white/5 transition-all">
                  Our Work
                </Link>
              </div>
              
            </div>
            
            <div className="lg:w-2/5 lg:pl-16 relative">
            
              <img
  src="/design.png"
  alt="de"
  className="w-full h-auto mix-blend-multiply"
/>

            </div>
          </div>
        </div>
      </section>


      <section className="py-24 relative z-10 ">
        <div className="container mx-auto px-6">
          <div className="mb-20">
            <h2 className="text-4xl font-bold text-white mb-4">Platform Features</h2>
            <div className="w-20 h-1 bg-purple-500"></div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="group">
              <div className="h-full border  bg-gray-900/30 backdrop-blur-sm p-8 transition-all duration-300 hover:cursor-pointer hover:border-neutral-800 hover:bg-black hover:translate-1 ">
                <div className="w-12 h-12 bg-purple-900/60 rounded-md flex items-center justify-center mb-6 group-hover:bg-purple-800 transition-colors">
                  <Users className="text-purple-400 w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Agent Dashboard</h3>
                <p className="text-gray-400 mb-8">Track all simulated traders, their personalities, balances, and activity in a comprehensive dashboard.</p>
                <Link href="/agent-dashboard" className="inline-flex items-center text-white group-hover:text-purple-400 transition-colors font-medium">
                  Open Dashboard
                  <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
            
            <div className="group">
              <div className="h-full border  bg-gray-900/30 backdrop-blur-sm p-8 transition-all duration-300 hover:cursor-pointer hover:bg-black hover:translate-1">
                <div className="w-12 h-12 bg-purple-900/60 rounded-md flex items-center justify-center mb-6 group-hover:bg-purple-800 transition-colors">
                  <BarChart3 className="text-purple-400 w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Simulation Monitoring</h3>
                <p className="text-gray-400 mb-8">Track simulation metrics, view transaction history, and control the autonomous behavior of your trading agents.</p>
                <Link href="/monitoring" className="inline-flex items-center text-white group-hover:text-purple-400 transition-colors font-medium">
                  View Monitoring
                  <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
            
            <div className="group">
              <div className="h-full border  bg-gray-900/30 backdrop-blur-sm p-8 transition-all duration-300 hover:cursor-pointer hover:border-purple-950 hover:translate-1" >
                <div className="w-12 h-12 bg-purple-900/60 rounded-md flex items-center justify-center mb-6 group-hover:bg-purple-800 transition-colors">
                  <MessageCircle className="text-purple-400 w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-3">Real-time Chat</h3>
                <p className="text-gray-400 mb-8">Observe how agents interact, share trading ideas, and influence each other in real-time.</p>
                <Link href="/monitoring" className="inline-flex items-center text-white group-hover:text-purple-400 transition-colors font-medium">
                  View Chat
                  <ChevronRight className="ml-1 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>


  

      {/* Footer */}
      <footer className="py-10 border-t border-gray-800/50 mt-12 ">
        <div className="container mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center mb-8 md:mb-0">
              <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
              <span className="text-xl font-bold text-white">
                NeuralTraders
              </span>
            </div>
            
           
            
            <div className="text-gray-500 text-sm">
              © {new Date().getFullYear()} NeuralTraders. All rights reserved.
            </div>
          </div>
        </div>
      </footer>

     
    </div>
  );
}