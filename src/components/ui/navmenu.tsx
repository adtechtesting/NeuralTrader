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
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <p className="cursor-pointer text-gray-300 hover:text-white transition-colors px-6 py-3.5 text-lg font-semibold rounded-xl hover:bg-white/5">
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
      className="relative flex justify-center items-center space-x-2"
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
      className="flex space-x-4 p-4 rounded-xl hover:bg-white/5 transition-all duration-300 group"
    >
      <img
        src={src}
        width={160}
        height={90}
        alt={title}
        className="shrink-0 rounded-lg shadow-lg border border-white/10 group-hover:border-white/20 transition-colors"
      />
      <div>
        <h4 className="text-md font-bold mb-2 text-white group-hover:text-gray-100">
          {title}
        </h4>
        <p className="text-gray-400 text-base max-w-[12rem] leading-relaxed">
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
      className="text-gray-300 hover:text-white transition-colors duration-200 text-base font-semibold"
    >
      {children}
    </a>
  );
};
