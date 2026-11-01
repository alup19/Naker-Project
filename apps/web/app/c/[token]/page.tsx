import PublicCatalog from "../../ui/public-catalog";
import type { Metadata } from "next";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  try {
    const r = await fetch(
      `${process.env.API_URL || "http://localhost:4000"}/api/share/${token}`,
      { next: { revalidate: 60 } },
    );
    if (!r.ok) throw Error();
    const d = await r.json();
    return {
      title: `Catálogo exclusivo de ${d.distributor.name}`,
      description: `Preços especiais de ${d.distributor.name} para ${d.customerName}.`,
      openGraph: {
        title: `Catálogo exclusivo • ${d.distributor.name}`,
        description: "Confira seus preços e peça pelo WhatsApp.",
      },
    };
  } catch {
    return { title: "Catálogo exclusivo | Naker Distribuidor" };
  }
}
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <PublicCatalog identifier={token} personalized />;
}
