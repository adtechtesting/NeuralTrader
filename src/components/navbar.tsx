"use client";

import React from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Menu, MenuItem } from "./ui/navmenu";

export function NavbarDemo() {
  return (
    <div className="relative w-full flex items-center justify-center">
      <Navbar className="top-2" />
    </div>
  );
}

function Navbar({ className }: { className?: string }) {
  const handleHover = () => {}; // Dummy handler, can be removed later if not needed

  return (
    <div
      className={cn(
        "fixed top-4 inset-x-0 max-w-5xl mx-auto z-50",
        className
      )}
    >
      <div className="flex justify-between items-center bg-transparent shadow-md rounded-xl border  backdrop-blur-md">
        <Link href="/" className="text-2xl font-bold tracking-tight text-neutral-300 px-2">
          NeuralTrader
        </Link>

        <Menu setActive={handleHover}>
          <Link href="/agent-dashboard">
            <MenuItem setActive={handleHover} item="Dashboard" />
          </Link>
          <Link href="/monitoring">
            <MenuItem setActive={handleHover} item="Simulation" />
          </Link>
        </Menu>
      </div>
    </div>
  );
}
