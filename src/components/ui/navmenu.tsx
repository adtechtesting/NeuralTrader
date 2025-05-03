"use client";
import React from "react";

export const MenuItem = ({
  setActive, // can be removed if unused elsewhere
  item,
}: {
  setActive: (item: string) => void;
  item: string;
}) => {
  return (
    <div onMouseEnter={() => setActive(item)} className="relative bg-transparent">
      <p className="cursor-pointer  hover:opacity-[0.9]  text-gray-200 hover:text-purple-300 transition-colors px-5 py-2 text-lg">
        {item}
      </p>
    </div>
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
      className="relative rounded-full border border-transparent text-neutral-400 shadow-input flex justify-center space-x-4 px-8 py-6"
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
    <a href={href} className="flex space-x-2">
      <img
        src={src}
        width={140}
        height={70}
        alt={title}
        className="shrink-0 rounded-md shadow-2xl"
      />
      <div>
        <h4 className="text-xl font-bold mb-1 text-neutral-300">{title}</h4>
        <p className="text-neutral-white text-sm max-w-[10rem]">{description}</p>
      </div>
    </a>
  );
};

export const HoveredLink = ({ children, ...rest }: any) => {
  return (
    <a
      {...rest}
      className="text-neutral-700 hover:text-black"
    >
      {children}
    </a>
  );
};
