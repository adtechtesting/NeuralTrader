"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  const handleHover = () => {};
  const network = WalletAdapterNetwork.Devnet;
  const endpoint = useMemo(() => clusterApiUrl(network), [network]);
  const connection = useMemo(() => new Connection(endpoint), [endpoint]);
  const wallet = useWallet();
  const [walletbalance, setwalletbalance] = useState<number | null>(null);
  const [isAllowed, setisAllowed] = useState(false);

  useEffect(() => {
    if (wallet.publicKey) {
      checkBalance();
    }
  });

  const checkBalance = async () => {
    if (!wallet.publicKey) {
      return Error("wallet not connected");
    }

    try {
      const balance = await connection.getBalance(wallet.publicKey);
      const balanceinsol = balance / LAMPORTS_PER_SOL;
      setwalletbalance(balanceinsol);

      if (balance < 0.05) {
        return Error("At least 0.05 sol required ");
      }
      setisAllowed(balanceinsol >= 0.05);
    } catch (error) {
      console.log(error, "error in getting balance");
    }
  };

  return (
    <div className={cn("fixed top-4 inset-x-0 max-w-8xl mx-auto z-50 px-4", className)}>
      <div className="relative flex justify-between items-center backdrop-blur-md bg-white/0.05 px-6 py-2 shadow-lg">
        {/* Logo */}
        <Link 
          href="/" 
          className="flex items-center group"
        >
          <span className=" font-bold text-xl tracking-tight text-white group-hover:text-white/90 transition-colors underline">
            ℕ𝕖𝕦𝕣𝕒𝕝𝕥𝕣𝕒𝕕𝕖𝕣
          </span>
        </Link>

        {/* Nav Menu */}
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
          <Link href="/token-setup">
            <MenuItem setActive={handleHover} item="Select Token" />
          </Link>
        </Menu>

        {/* Wallet Button */}
        <div className="relative">
          <WalletMultiButton className="!bg-white !text-black !font-semibold !rounded-full !text-sm !px-4 !py-1.5 hover:!bg-white/90 !transition-all" />
        </div>
      </div>
    </div>
  );
}

