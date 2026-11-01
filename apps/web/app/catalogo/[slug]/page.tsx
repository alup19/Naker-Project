import PublicCatalog from "../../ui/public-catalog";
import type { Metadata } from "next";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  try {
    const r = await fetch(
      `${process.env.API_URL || "http://localhost:4000"}/api/catalog/${slug}`,
      { next: { revalidate: 300 } },
    );
    if (!r.ok) throw Error();
    const d = await r.json();
    return {
      title: `${d.distributor.name} | Catálogo Naker`,
      description: `Confira os produtos e preços de ${d.distributor.name}.`,
      openGraph: {
        title: `Catálogo de ${d.distributor.name}`,
        description: "Veja produtos e peça pelo WhatsApp.",
      },
    };
  } catch {
    return { title: "Catálogo | Naker Distribuidor" };
  }
}
export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicCatalog identifier={slug} />;
}
