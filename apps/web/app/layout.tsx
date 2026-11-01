import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Naker Distribuidor | Catálogo Premium",
  description: "Seu catálogo de vendas, elegante e sempre à mão.",
  openGraph: {
    title: "Naker Distribuidor",
    description: "Catálogo de produtos e pedidos pelo WhatsApp",
    type: "website",
  },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
