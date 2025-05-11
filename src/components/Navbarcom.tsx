"use client";

import React, { useEffect, useMemo, useState} from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Menu, MenuItem } from "./ui/navmenu";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet } from "@solana/wallet-adapter-react";
import { clusterApiUrl, Connection, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";


export function NavbarDemo() {


  return (
    <div className="relative w-full flex items-center justify-center">
      <Navbar className="top-2" />
    </div>
  );
}

function Navbar({ className }: { className?: string }) {
  const handleHover = () => {}; // Dummy handler, can be removed later if not needed
  const network=WalletAdapterNetwork.Devnet; 
  const endpoint=useMemo(()=> clusterApiUrl(network),[network])
  const connection=useMemo(()=> new Connection(endpoint),[endpoint]) 
  const wallet=useWallet();
   const [walletbalance,setwalletbalance]=useState<number|null>(null)
   const [isAllowed,setisAllowed]=useState(false)      

  useEffect(()=>{
    if(wallet.publicKey){
      checkBalance()
    }
  })


  const checkBalance=async()=>{
     if(!wallet.publicKey){
      return Error("wallet not connectedf")
     }

      try {
        const balance=await connection.getBalance(wallet.publicKey); 
        const balanceinsol=balance/LAMPORTS_PER_SOL 
         setwalletbalance(balanceinsol)  

         if(balance < 0.05) {
          return Error("At least 0.05 sol required ")
         }
       setisAllowed(balanceinsol >= 0.05)

      } catch (error) { 
        console.log(error,"error in  getting balanace")
        
      }
     
   
  }
  return (
    <div
      className={cn(
        "fixed top-6 inset-x-0 max-w-7xl mx-auto z-50",
        className
      )}
    >
      <div className="flex justify-between items-center bg-transparent shadow-md rounded-xl border  backdrop-blur-md  ">
        <Link href="/" className="text-2xl font-bold  px-2  tracking-tight text-white">
          NeuralTrader
        </Link>

       
               <Menu setActive={handleHover}>
                
               <Link href="/agent-dashboard">
                 <MenuItem setActive={handleHover} item="Dashboard" />
               </Link>
               <Link href="/monitoring">
                 <MenuItem setActive={handleHover} item="Simulation" />
               </Link>
               <Link href="/agent-test">
               <MenuItem setActive={handleHover} item="Create Agent" />
               </Link>
             </Menu>
          
        <div className="ml-4 z-10">
         
          <WalletMultiButton  />
        </div>

        
      </div>x
    </div>
  );
}
