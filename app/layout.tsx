import "./globals.css";
import { Inter, Montserrat } from "next/font/google";
import Providers from './providers';

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const mont = Montserrat({ subsets: ["latin"], variable: "--font-mont" });

export const metadata = { title: "WebtoGO Sales" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}