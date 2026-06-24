import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeToggle } from "./ThemeToggle";

// Setzt das gespeicherte Theme VOR dem ersten Paint (verhindert Flackern).
const themeInit = `(function(){try{var t=localStorage.getItem('treasure-theme');document.documentElement.dataset.theme=(t==='contrast'?'contrast':'pastel');}catch(e){document.documentElement.dataset.theme='pastel';}})();`;

export const metadata: Metadata = {
  title: "immada – Erinnerungskugeln",
  description:
    "immada bewahrt deine Stimme in einer Erinnerungskugel – immer für dich da, wann immer dein Herz es wünscht.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f1115",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body>
        <ThemeToggle />
        {children}
      </body>
    </html>
  );
}
