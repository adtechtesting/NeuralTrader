'use client';

import "./globals.css";
import { NavbarDemo } from '@/components/navbar';
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
       
      </head>
      <body>
    

          <NavbarDemo></NavbarDemo>
          {children}
     
      </body>
    </html>
  );
}
