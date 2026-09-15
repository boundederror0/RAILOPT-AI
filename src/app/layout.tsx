import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";
import { AuthProviderWrapper } from "@/components/auth/auth-provider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "RAILOPT AI | Railway Maintenance & Block Planning",
  description:
    "Intelligent railway maintenance and block planning platform for the Madurai Division (demonstration data).",
  icons: {
    icon: "/railopt-logo.png",
    shortcut: "/railopt-logo.png",
    apple: "/railopt-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head />
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ToastProvider>
          <AuthProviderWrapper>{children}</AuthProviderWrapper>
        </ToastProvider>
      </body>
    </html>
  );
}