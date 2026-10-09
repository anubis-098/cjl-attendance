import type { Metadata } from "next";
import "./globals.css";
import LanguageProvider from "@/components/language-provider";
export const metadata: Metadata = {
  title: "CJ Agent · Attendance & OT",
  description: "Agency time attendance and overtime reconciliation workspace",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="th">
      <body>
        <LanguageProvider>{children}</LanguageProvider>
      </body>
    </html>
  );
}
