"use client";
import React from "react";
import { motion } from "framer-motion";

export const MenuItem = ({
  setActive,
  item,
}: {
  setActive: (item: string) => void;
  item: string;
}) => {
  return (
    <motion.div 
      onMouseEnter={() => setActive(item)} 
      className="relative"
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <p className="cursor-pointer text-white/70 hover:text-white transition-colors px-4 py-1.5 text-md font-medium rounded-full hover:bg-white/5">
        {item}
      </p>
    </motion.div>
  );
};

export const Menu = ({
  setActive,
  children,
}: {
  setActive: (item: string | null) => void;
  children: React.ReactNode;
}) => {
  return (
    <nav
      onMouseLeave={() => setActive(null)}
      className="relative flex justify-center items-center space-x-1"
    >
      {children}
    </nav>
  );
};

export const ProductItem = ({
  title,
  description,
  href,
  src,
}: {
  title: string;
  description: string;
  href: string;
  src: string;
}) => {
  return (
    <a 
      href={href} 
      className="flex space-x-3 p-3 rounded-lg hover:bg-white/5 transition-all duration-300 group"
    >
      <img
        src={src}
        width={120}
        height={68}
        alt={title}
        className="shrink-0 rounded-lg shadow-lg border border-white/10 group-hover:border-white/20 transition-colors"
      />
      <div>
        <h4 className="text-sm font-bold mb-1 text-white group-hover:text-gray-100">
          {title}
        </h4>
        <p className="text-gray-400 text-xs max-w-[10rem] leading-relaxed">
          {description}
        </p>
      </div>
    </a>
  );
};

export const HoveredLink = ({ children, ...rest }: any) => {
  return (
    <a
      {...rest}
      className="text-white/70 hover:text-white transition-colors duration-200 text-sm font-medium"
    >
      {children}
    </a>
  );
};
