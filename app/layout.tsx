import type { Metadata } from "next";
import "./globals.css";

export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover" as const, themeColor: "#123653" };

export const metadata: Metadata = {
  title: "Nossa Viagem 2026",
  description: "Planejamento da viagem em família: Chicago, Dallas e Orlando.",
  other: {
    // iPhones mais antigos ainda usam esta marcação para abrir em tela cheia.
    "apple-mobile-web-app-capable": "yes",
  },
  manifest: "/manifest.webmanifest",
  applicationName: "Nossa Viagem 2026",
  appleWebApp: { capable: true, title: "Viagem 2026", statusBarStyle: "black-translucent" },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }, { url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="antialiased">{children}</body>
    </html>
  );
}
