"use client";
import { useEffect, useState } from "react";
import { Brand } from "../brand";
import { copyText } from "../lib/copy-text";
import { Toaster, toast } from "sonner";
import {
  ShoppingBag,
  Share2,
  Plus,
  Minus,
  MessageCircle,
} from "lucide-react";
const API = "";
const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n / 100,
  );
export default function PublicCatalog({
  identifier,
  personalized = false,
}: {
  identifier: string;
  personalized?: boolean;
}) {
  const [data, setData] = useState<any>(null),
    [error, setError] = useState(""),
    [cart, setCart] = useState<Record<string, number>>({});
  useEffect(() => {
    fetch(`${API}/api/${personalized ? "share" : "catalog"}/${identifier}`)
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw Error(d.message);
        return d;
      })
      .then((catalog) => {
        document.documentElement.dataset.mode = catalog.distributor.themeMode === "light" ? "light" : "dark";
        document.documentElement.dataset.accent = ["gold", "blue", "emerald"].includes(catalog.distributor.accentColor)
          ? catalog.distributor.accentColor
          : "gold";
        setData(catalog);
      })
      .catch((e) => setError(e.message || "Catálogo indisponível."));
  }, [identifier, personalized]);
  const add = (id: string, n: number) =>
    setCart({ ...cart, [id]: Math.max(0, (cart[id] || 0) + n) });
  const total =
    data?.products?.reduce(
      (s: number, p: any) => s + (cart[p.id] || 0) * p.priceCents,
      0,
    ) || 0;
  function order() {
    if (!data?.distributor.phone) {
      alert("O distribuidor ainda não adicionou um telefone de contato.");
      return;
    }
    const lines = data.products
      .filter((p: any) => cart[p.id])
      .map((p: any) => `${cart[p.id]}x ${p.name} — ${money(p.priceCents)}`)
      .join("\n");
    const text = `Olá${data.customerName ? `, ${data.customerName}` : ""}! Gostaria de fazer este pedido:\n\n${lines}\n\nTotal: ${money(total)}`;
    window.open(
      `https://wa.me/${data.distributor.phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`,
      "_blank",
    );
  }
  if (error)
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <section className="panel rounded-2xl p-8 text-center">
          <Brand />
          <p className="mt-8 text-[#f5e6a8]">{error}</p>
        </section>
      </main>
    );
  if (!data)
    return (
      <main className="grid min-h-screen place-items-center text-[#d4af37]">
        Carregando catálogo…
      </main>
    );
  return (
    <main className="min-h-screen pb-32">
      <Toaster position="top-right" theme={data.distributor.themeMode === "light" ? "light" : "dark"} duration={3000} toastOptions={{ style: { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--panel-border)" } }} />
      <header className="border-b border-[#413719] px-4 py-5 sm:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Brand small />
          <div className="flex gap-2">
            <button
              onClick={async () => {
                if (await copyText(location.href)) toast.success("Link do catálogo copiado.");
                else {
                  window.prompt("Não foi possível copiar automaticamente. Copie o link abaixo:", location.href);
                  toast("Copie o link exibido para compartilhar o catálogo.");
                }
              }}
              className="rounded-lg border border-[#5b4b20] p-2 text-[#f5e6a8]"
              title="Copiar link"
            >
              <Share2 size={18} />
            </button>
            <button
              onClick={() =>
                window.open(
                  `https://wa.me/?text=${encodeURIComponent(`${data.distributor.name} • Catálogo: ${location.href}`)}`,
                  "_blank",
                )
              }
              className="rounded-lg border border-[#5b4b20] p-2 text-[#f5e6a8]"
              title="Compartilhar no WhatsApp"
            >
              <MessageCircle size={18} />
            </button>
          </div>
        </div>
      </header>
      <section className="mx-auto max-w-6xl px-4 py-9 sm:px-8">
        <div className="mb-8">
          <p className="text-xs tracking-[.2em] text-[#d4af37]">
            CATÁLOGO EXCLUSIVO
          </p>
          <h1 className="serif mt-2 text-4xl">{data.distributor.name}</h1>
          {data.customerName && (
            <p className="mt-2 text-[#aaa69b]">
              Uma seleção para {data.customerName}
            </p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {data.products.map((p: any) => (
            <article key={p.id} className="panel overflow-hidden rounded-2xl">
              <div className="h-1 bg-gradient-to-r from-transparent via-[#d4af37] to-transparent" />
              <div className="p-3 sm:p-4">
                <p className="min-h-10 text-sm sm:text-base">{p.name}</p>
                <p className="gold-text mt-1 font-bold">
                  {money(p.priceCents)}
                </p>
                <div className="mt-3 flex items-center justify-between rounded-lg border border-[#48412f]">
                  <button
                    className="p-2"
                    onClick={() => add(p.id, -1)}
                    aria-label="Remover uma unidade"
                  >
                    <Minus size={15} />
                  </button>
                  <span className="text-sm">{cart[p.id] || 0}</span>
                  <button
                    className="p-2 text-[#f5e6a8]"
                    onClick={() => add(p.id, 1)}
                    aria-label="Adicionar uma unidade"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
      <footer className="fixed inset-x-0 bottom-0 border-t border-[#5b4b20] bg-[#111]/95 p-4 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <div>
            <p className="text-xs text-[#aaa69b]">Total do pedido</p>
            <p className="gold-text text-lg font-bold">{money(total)}</p>
          </div>
          <button
            onClick={order}
            disabled={!total}
            className="gold-button rounded-xl px-5 py-3"
          >
            <ShoppingBag className="mr-2 inline" size={18} />
            Pedir pelo WhatsApp
          </button>
        </div>
      </footer>
    </main>
  );
}
