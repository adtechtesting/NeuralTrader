
import type { Metadata } from "next";
import { Bricolage_Grotesque, Lexend_Deca } from 'next/font/google';

import "./globals.css";
import { WalletContextProvider } from "@/components/Walletprovider";
import { NavbarDemo } from "@/components/Navbarcom";
import { Toaster } from "@/components/ui/sonner";
import MobilePopupWarning from "@/components/mobilepopup";






const mainFont = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["200", "300", "500", "600", "700", "800"],
  variable: '--font-main'
});

const secondaryFont = Lexend_Deca({
  subsets: ["latin"],
  weight: ["100", "200", "300", "500", "600", "700", "800"],
  variable: '--font-secondary'
});


export const metadata: Metadata = {
  title: "NeuralTrader"
  
};



export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
    <body className={`${mainFont.variable} ${secondaryFont.variable} font-mainFont antialiased`}>
      <WalletContextProvider>
        <NavbarDemo/>
     
        <Toaster></Toaster>
       <MobilePopupWarning></MobilePopupWarning>
        {children}
      </WalletContextProvider>
    </body>
  </html>
  );
}
