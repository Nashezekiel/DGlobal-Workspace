import type { Metadata } from "next";
import "./globals.css";
import dgLogo from "@/app/DGlogo.png";

export const metadata: Metadata = {
  title: "D-GEW",
  description: "Internship Management Platform",
  icons: {
    icon: dgLogo.src,
    shortcut: dgLogo.src,
    apple: dgLogo.src,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
