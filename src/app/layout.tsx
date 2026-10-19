import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";
import Footer from "@/components/Footer";
import MusicPlayer from "@/components/MusicPlayer";

export const metadata: Metadata = {
  title: {
    default: "SHPE LAMC | Society of Hispanic Professional Engineers",
    template: "%s | SHPE LAMC",
  },
  description:
    "SHPE LAMC chapter at Los Angeles Mission College: events, sponsorships, scholarships, and how to join.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,400..900&family=Outfit:wght@400;500;600;700;800&family=Press+Start+2P&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-full flex flex-col">
        <a href="#main-content" className="skip-link">
          Skip to main content
        </a>
        <Nav />
        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          {children}
        </main>
        <Footer />
        <MusicPlayer />
      </body>
    </html>
  );
}
