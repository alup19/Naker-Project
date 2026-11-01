"use client";
import { useEffect, useState } from "react";
import {
  Package,
  Users,
  Plus,
  Search,
  LogOut,
  LayoutDashboard,
  Share2,
  Copy,
  Menu,
  X,
  Trash2,
  ArrowUpRight,
  Pencil,
  Camera,
  ImagePlus,
  Download,
  Settings,
  Tags,
  Sun,
  Moon,
} from "lucide-react";
import { Brand } from "../brand";
import { Button } from "@/components/ui/button";
import { Toaster, toast } from "sonner";
import { copyText } from "../lib/copy-text";
import { formatPhoneForDisplay, formatPhoneForInput, normalizePhoneForStorage } from "../lib/format-phone";
import { SearchableSelect } from "./searchable-select";
import { ChoiceSelect } from "./choice-select";
import {
  deleteLocalProductImage,
  getLocalProductImage,
  saveLocalProductImage,
} from "../lib/local-product-images";
const API = "";
type Product = {
  id: string;
  name: string;
  description?: string;
  priceCents: number;
  imageUrl?: string | null;
  active?: boolean;
  categoryId?: string | null;
  category?: { name: string } | null;
  createdAt?: string;
};
type Customer = {
  id: string;
  name: string;
  phone: string;
  notes?: string;
  linkActive: boolean;
  publicToken?: string;
};
type EditorTarget = { type: "product" | "customer"; id: string } | null;
type DeleteTarget = { type: "product" | "customer" | "category"; id: string; name: string } | null;
const money = (n: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    n / 100,
  );
export default function Dashboard({
  startLogin = false,
}: {
  startLogin?: boolean;
}) {
  const [token, setToken] = useState(""),
    [user, setUser] = useState<any>(null),
    [tab, setTab] = useState("Visão geral"),
    [products, setProducts] = useState<Product[]>([]),
    [customers, setCustomers] = useState<Customer[]>([]),
    [categories, setCategories] = useState<any[]>([]),
    [search, setSearch] = useState(""),
    [categoryFilter, setCategoryFilter] = useState("all"),
    [statusFilter, setStatusFilter] = useState("all"),
    [sort, setSort] = useState("name"),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false),
    [menu, setMenu] = useState(false),
    [login, setLogin] = useState(startLogin),
    [form, setForm] = useState<any>({}),
    [selected, setSelected] = useState<Customer | null>(null),
    [prices, setPrices] = useState<any[]>([]),
    [customerPriceValues, setCustomerPriceValues] = useState<Record<string, string>>({}),
    [savedCustomerPriceCents, setSavedCustomerPriceCents] = useState<Record<string, number>>({}),
    [savingPrices, setSavingPrices] = useState(false),
    [customerSearch, setCustomerSearch] = useState(""),
    [localPhotos, setLocalPhotos] = useState<Record<string, string>>({}),
    [pendingPhoto, setPendingPhoto] = useState<File | null>(null),
    [menuCustomerId, setMenuCustomerId] = useState(""),
    [menuPriceCents, setMenuPriceCents] = useState<Record<string, number>>({}),
    [loadingMenuPrices, setLoadingMenuPrices] = useState(false),
    [menuFiles, setMenuFiles] = useState<File[]>([]),
    [generatingMenu, setGeneratingMenu] = useState(false),
    [editor, setEditor] = useState<EditorTarget>(null),
    [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null),
    [contactPhone, setContactPhone] = useState(""),
    [themeMode, setThemeMode] = useState<"dark" | "light">("dark"),
    [accentColor, setAccentColor] = useState<"gold" | "blue" | "emerald">("gold"),
    [savingAppearance, setSavingAppearance] = useState(false),
    [categoryName, setCategoryName] = useState(""),
    [showCategoryManager, setShowCategoryManager] = useState(false);
  const setMessage = (text: string) => {
    if (!text) return;
    if (/não foi|falha|erro|inválid|expirad|não encontrado|sem espaço/i.test(text)) toast.error(text);
    else toast(text);
  };
  useEffect(() => {
    const t = localStorage.getItem("naker-token");
    const u = localStorage.getItem("naker-user");
    if (t) {
      setToken(t);
      setUser(u ? JSON.parse(u) : null);
      setContactPhone(u ? formatPhoneForInput(JSON.parse(u).phone || "") : "");
    }
  }, []);
  useEffect(() => {
    if (!user) return;
    setThemeMode(user.themeMode === "light" ? "light" : "dark");
    setAccentColor(user.accentColor === "blue" || user.accentColor === "emerald" ? user.accentColor : "gold");
  }, [user]);
  useEffect(() => {
    document.documentElement.dataset.mode = themeMode;
    document.documentElement.dataset.accent = accentColor;
    document.documentElement.style.colorScheme = themeMode;
  }, [themeMode, accentColor]);
  const req = async (path: string, opts: any = {}) => {
    const send = (access: string) =>
      fetch(`${API}/api/${path}`, {
        ...opts,
        headers: {
          ...(opts.body && !(opts.body instanceof FormData)
            ? { "Content-Type": "application/json" }
            : {}),
          ...(access ? { Authorization: `Bearer ${access}` } : {}),
          ...opts.headers,
        },
        credentials: "include",
      });
    let access = token;
    let r = await send(access);
    if (r.status === 401 && path !== "auth/refresh") {
      const refreshed = await fetch(`${API}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
      });
      if (!refreshed.ok) {
        localStorage.removeItem("naker-token");
        throw Error("Sua sessão expirou. Entre novamente.");
      }
      const session = await refreshed.json();
      access = session.accessToken;
      localStorage.setItem("naker-token", access);
      setToken(access);
      setUser(session.user);
      localStorage.setItem("naker-user", JSON.stringify(session.user));
      r = await send(access);
    }
    const d = await r.json();
    if (!r.ok) throw Error(d.message || "Não foi possível concluir.");
    return d;
  };
  useEffect(() => {
    if (!token) return;
    Promise.all([req("products"), req("customers"), req("categories")])
      .then(([p, c, cats]) => {
        setProducts(p);
        setCustomers(c);
        setCategories(cats);
      })
      .catch((e) => setMessage(e.message));
  }, [token]);
  useEffect(() => {
    let current = true;
    const createdUrls: string[] = [];
    Promise.all(products.map(async (product) => {
      try {
        const blob = await getLocalProductImage(product.id);
        if (!blob) return [product.id, ""] as const;
        const url = URL.createObjectURL(blob);
        createdUrls.push(url);
        return [product.id, url] as const;
      } catch {
        return [product.id, ""] as const;
      }
    })).then((items) => {
      if (current) setLocalPhotos(Object.fromEntries(items.filter(([, url]) => url)));
      else createdUrls.forEach(URL.revokeObjectURL);
    });
    return () => {
      current = false;
      createdUrls.forEach(URL.revokeObjectURL);
    };
  }, [products]);
  async function enter(e: any) {
    e.preventDefault();
    setBusy(true);
    try {
      const registrationPhone = form.phone?.trim() ? normalizePhoneForStorage(form.phone) : "";
      if (!login && form.phone?.trim() && !registrationPhone) {
        throw Error("Informe um telefone completo, com DDD.");
      }
      const d = await fetch(`${API}/api/auth/${login ? "login" : "register"}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(
          login
            ? { email: form.email, password: form.password }
            : {
                name: form.name,
                email: form.email,
                password: form.password,
                phone: registrationPhone || undefined,
              },
        ),
      });
      const v = await d.json();
      if (!d.ok) throw Error(v.message);
      localStorage.setItem("naker-token", v.accessToken);
      localStorage.setItem("naker-user", JSON.stringify(v.user));
      setToken(v.accessToken);
      setUser(v.user);
      setContactPhone(formatPhoneForInput(v.user.phone || ""));
      setMessage("Bem-vindo ao seu catálogo.");
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function saveProduct(e: any) {
    e.preventDefault();
    try {
      const payload = {
        name: form.name,
        priceCents: Math.round(Number(form.price) * 100),
        ...(editor?.type === "product" ? { categoryId: form.categoryId || null } : form.categoryId ? { categoryId: form.categoryId } : {}),
        ...(editor?.type === "product" ? { description: form.description || null } : form.description ? { description: form.description } : {}),
        active: form.active !== false,
      };
      const editing = editor?.type === "product";
      const saved = await req(editing ? `products/${editor.id}` : "products", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      });
      let photoMessage = editing ? "Produto atualizado." : "Produto adicionado.";
      if (pendingPhoto) {
        try {
          await saveLocalProductImage(saved.id, pendingPhoto);
        } catch (e: any) {
          photoMessage = `Produto salvo, mas a foto não foi guardada: ${e.message}`;
        }
      }
      setShow(false);
      setEditor(null);
      setForm({});
      setPendingPhoto(null);
      setProducts(await req("products"));
      setMessage(photoMessage);
    } catch (e: any) {
      setMessage(e.message);
    }
  }
  async function editProduct(p: Product) {
    setShow(false);
    setEditor({ type: "product", id: p.id });
    setPendingPhoto(null);
    setForm({
      name: p.name,
      price: (p.priceCents / 100).toFixed(2),
      description: p.description || "",
      categoryId: p.categoryId || "",
      active: p.active !== false,
    });
  }
  async function changeLocalPhoto(productId: string, file?: File) {
    if (!file) return;
    try {
      await saveLocalProductImage(productId, file);
      setProducts([...products]);
      setMessage("Foto salva neste aparelho. Ela será usada ao gerar o cardápio.");
    } catch (e: any) {
      setMessage(e.message);
    }
  }
  async function removeLocalPhoto(productId: string) {
    try {
      await deleteLocalProductImage(productId);
      setProducts([...products]);
      setMessage("Foto removida deste aparelho.");
    } catch (e: any) {
      setMessage(e.message);
    }
  }
  async function addCategory() {
    setCategoryName("");
    setShowCategoryManager(true);
  }
  async function saveCategory(e: any) {
    e.preventDefault();
    try {
      const c = await req("categories", {
        method: "POST",
        body: JSON.stringify({ name: categoryName.trim() }),
      });
      setCategories([...categories, c]);
      setCategoryName("");
      setMessage("Categoria criada.");
    } catch (e: any) {
      setMessage(e.message);
    }
  }
  async function saveCustomer(e: any) {
    e.preventDefault();
    try {
      const editing = editor?.type === "customer";
      const phone = normalizePhoneForStorage(form.phone);
      if (!phone) {
        setMessage("Informe um telefone completo, com DDD.");
        return;
      }
      await req(editing ? `customers/${editor.id}` : "customers", {
        method: editing ? "PATCH" : "POST",
        body: JSON.stringify({ name: form.name, phone, notes: form.notes || "" }),
      });
      setCustomers(await req("customers"));
      setShow(false);
      setEditor(null);
      setForm({});
      setMessage(editing ? "Cliente atualizado." : "Cliente adicionado.");
    } catch (e: any) {
      setMessage(e.message);
    }
  }
  function editCustomer(customer: Customer) {
    setShow(false);
    setEditor({ type: "customer", id: customer.id });
    setForm({ name: customer.name, phone: formatPhoneForInput(customer.phone), notes: customer.notes || "" });
  }
  function askDelete(type: "product" | "customer" | "category", id: string, name: string) {
    setDeleteTarget({ type, id, name });
  }
  async function selectCustomer(c: Customer) {
    setSelected(c);
    setPrices([]);
    setCustomerPriceValues({});
    setSavedCustomerPriceCents({});
    try {
      const v = await req(`customers/${c.id}/prices`);
      setPrices(v);
      setCustomerPriceValues(Object.fromEntries(v.map((p: any) => [
        p.id,
        ((p.prices?.[0]?.priceCents ?? p.priceCents) / 100).toFixed(2),
      ])));
      setSavedCustomerPriceCents(Object.fromEntries(v.map((p: any) => [
        p.id,
        p.prices?.[0]?.priceCents ?? p.priceCents,
      ])));
    } catch (e: any) {
      setMessage(e.message);
    }
  }
  async function saveChangedPrices() {
    if (!selected) return;
    const changed = prices.filter((product: any) => {
      const value = customerPriceValues[product.id];
      const numeric = Number(value);
      return value !== undefined && (!value.trim() || !Number.isFinite(numeric) || numeric < 0 || Math.round(numeric * 100) !== savedCustomerPriceCents[product.id]);
    });
    if (!changed.length) {
      setMessage("Não há alterações de preço para salvar.");
      return;
    }
    const invalid = changed.find((product: any) => {
      const value = customerPriceValues[product.id];
      return !value?.trim() || !Number.isFinite(Number(value)) || Number(value) < 0;
    });
    if (invalid) {
      setMessage(`Informe um preço válido para ${invalid.name}.`);
      return;
    }
    const updates = changed.map((product: any) => ({
      productId: product.id,
      priceCents: Math.round(Number(customerPriceValues[product.id]) * 100),
    }));
    setSavingPrices(true);
    try {
      await req(`customers/${selected.id}/prices/batch`, {
        method: "PUT",
        body: JSON.stringify({ items: updates }),
      });
      const nextSaved = { ...savedCustomerPriceCents };
      updates.forEach((item) => { nextSaved[item.productId] = item.priceCents; });
      setSavedCustomerPriceCents(nextSaved);
      setPrices((current) => current.map((product: any) => {
        const item = updates.find((update) => update.productId === product.id);
        return item ? { ...product, prices: [{ ...(product.prices?.[0] || {}), priceCents: item.priceCents }] } : product;
      }));
      setMessage(`${updates.length} ${updates.length === 1 ? "preço salvo" : "preços salvos"} para ${selected.name}.`);
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setSavingPrices(false);
    }
  }
  async function setCustomerLinkActive(c: Customer, active: boolean) {
    try {
      const d = await req(`customers/${c.id}/share-link`, {
        method: "POST",
        body: JSON.stringify({ active }),
      });
      setCustomers(await req("customers"));
      setMessage(d.active ? "Link do cliente ativado." : "Link do cliente desativado.");
    } catch (e: any) {
      setMessage(e.message);
    }
  }
  async function copyCustomerLink(c: Customer) {
    if (!c.linkActive) return;
    try {
      const d = await req(`customers/${c.id}/share-link`, {
        method: "POST",
        body: JSON.stringify({ active: true }),
      });
      if (!d.token) throw new Error("Não foi possível obter o link deste cliente.");
      const link = `${location.origin}/c/${d.token}`;
      if (await copyText(link)) setMessage("Link do cliente copiado.");
      else {
        window.prompt("Não foi possível copiar automaticamente. Copie o link abaixo:", link);
        setMessage("Copie o link exibido para compartilhar com o cliente.");
      }
    } catch (e: any) {
      setMessage(e.message);
    }
  }
  async function saveContactPhone(e: any) {
    e.preventDefault();
    try {
      const phone = contactPhone.trim() ? normalizePhoneForStorage(contactPhone) : "";
      if (contactPhone.trim() && !phone) {
        setMessage("Informe um telefone completo, com DDD.");
        return;
      }
      const updated = await req("profile", {
        method: "PATCH",
        body: JSON.stringify({ phone }),
      });
      setContactPhone(formatPhoneForInput(updated.phone || ""));
      setUser(updated);
      localStorage.setItem("naker-user", JSON.stringify(updated));
      setMessage("WhatsApp de pedidos atualizado.");
    } catch (e: any) {
      setMessage(e.message);
    }
  }
  async function saveAppearance() {
    setSavingAppearance(true);
    try {
      const updated = await req("profile", {
        method: "PATCH",
        body: JSON.stringify({ themeMode, accentColor }),
      });
      setUser(updated);
      localStorage.setItem("naker-user", JSON.stringify(updated));
      setMessage("Aparência salva.");
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setSavingAppearance(false);
    }
  }
  async function chooseMenuCustomer(customerId: string) {
    setMenuCustomerId(customerId);
    setMenuFiles([]);
    setMenuPriceCents({});
    if (!customerId) return;
    setLoadingMenuPrices(true);
    try {
      const rows = await req(`customers/${customerId}/prices`);
      setMenuPriceCents(Object.fromEntries(rows.map((product: any) => [
        product.id,
        product.prices?.[0]?.priceCents ?? product.priceCents,
      ])));
    } catch (e: any) {
      setMessage(e.message);
    } finally {
      setLoadingMenuPrices(false);
    }
  }
  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      const { type, id, name } = deleteTarget;
      await req(`${type === "product" ? "products" : "customers"}/${id}`, { method: "DELETE" });
      if (type === "product") {
        await deleteLocalProductImage(id).catch(() => undefined);
        setProducts(await req("products"));
      } else if (type === "customer") {
        setCustomers(await req("customers"));
        if (selected?.id === id) setSelected(null);
      } else {
        setCategories(await req("categories"));
        setProducts(await req("products"));
        setCategoryFilter("all");
      }
      setDeleteTarget(null);
      setMessage(`${type === "product" ? "Produto" : type === "customer" ? "Cliente" : "Categoria"} ${name} removido.`);
    } catch (e: any) {
      setMessage(e.message);
    }
  }
  async function generateMenu() {
    const activeProducts = products.filter((product) => product.active !== false);
    if (!activeProducts.length) {
      setMessage("Cadastre produtos antes de gerar o cardápio.");
      return;
    }
    setGeneratingMenu(true);
    setMenuFiles([]);
    try {
      const lightMode = themeMode === "light";
      const imagePalette = {
        gold: lightMode
          ? { accent: "#745400", pale: "#654900" }
          : { accent: "#d4af37", pale: "#f5e6a8" },
        blue: lightMode
          ? { accent: "#1d4ed8", pale: "#1e40af" }
          : { accent: "#60a5fa", pale: "#bfdbfe" },
        emerald: lightMode
          ? { accent: "#047857", pale: "#065f46" }
          : { accent: "#34d399", pale: "#a7f3d0" },
      }[accentColor];
      const imageBackground = lightMode ? "#f4f3ef" : "#0a0a0a";
      const imageSurface = lightMode ? "#ffffff" : "#191919";
      const imageSurfaceAlt = lightMode ? "#eeece5" : "#24221b";
      const imageText = lightMode ? "#1b1b1b" : "#f5f5f0";
      const imageMuted = lightMode ? "#595959" : "#aaa69b";
      const personalized = menuCustomerId
        ? await req(`customers/${menuCustomerId}/prices`)
        : [];
      const pricesById = new Map<string, number>(
        personalized.map((p: any) => [p.id, p.prices?.[0]?.priceCents ?? p.priceCents]),
      );
      if (menuCustomerId) setMenuPriceCents(Object.fromEntries(pricesById));
      const pages: Product[][] = [];
      for (let i = 0; i < activeProducts.length; i += 8) pages.push(activeProducts.slice(i, i + 8));
      const generated: File[] = [];
      for (let pageIndex = 0; pageIndex < pages.length; pageIndex++) {
        const canvas = document.createElement("canvas");
        canvas.width = 1080;
        canvas.height = 1920;
        const context = canvas.getContext("2d");
        if (!context) throw new Error("Não foi possível preparar a imagem neste navegador.");
        context.fillStyle = imageBackground;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = imagePalette.accent;
        context.lineWidth = 3;
        context.strokeRect(36, 36, 1008, 1848);
        // Emblema geométrico de asas abertas do Naker.
        context.beginPath();
        context.moveTo(130, 100); context.lineTo(62, 62); context.lineTo(90, 108);
        context.lineTo(54, 96); context.lineTo(106, 144); context.lineTo(130, 119);
        context.lineTo(154, 144); context.lineTo(206, 96); context.lineTo(170, 108);
        context.lineTo(198, 62); context.closePath();
        context.fillStyle = imagePalette.accent;
        context.fill();
        context.fillStyle = imagePalette.pale;
        context.font = "bold 40px Georgia, serif";
        context.fillText((user?.name || "Naker Distribuidor").slice(0, 29), 230, 112);
        context.fillStyle = imageMuted;
        context.font = "22px Arial, sans-serif";
        const customerName = customers.find((c) => c.id === menuCustomerId)?.name;
        context.fillText(
          `${customerName ? `PARA ${customerName.toLocaleUpperCase("pt-BR")} • ` : "CATÁLOGO GERAL • "}${new Date().toLocaleDateString("pt-BR")} • ${pageIndex + 1}/${pages.length}`,
          68,
          174,
          944,
        );
        context.fillStyle = imagePalette.accent;
        context.fillRect(68, 205, 944, 2);
        for (let index = 0; index < pages[pageIndex].length; index++) {
          const product = pages[pageIndex][index];
          const y = 226 + index * 190;
          context.fillStyle = imageSurface;
          context.fillRect(60, y, 960, 170);
          context.strokeStyle = lightMode ? "#c3bdad" : "#44391c";
          context.lineWidth = 1;
          context.strokeRect(60, y, 960, 170);
          const photo = await getLocalProductImage(product.id);
          if (photo) {
            const photoUrl = URL.createObjectURL(photo);
            try {
              const image = new Image();
              await new Promise<void>((resolve, reject) => {
                image.onload = () => resolve();
                image.onerror = () => reject(new Error("Não foi possível carregar uma das fotos locais."));
                image.src = photoUrl;
              });
              context.save();
              context.beginPath();
              context.rect(78, y + 12, 146, 146);
              context.clip();
              const scale = Math.max(146 / image.width, 146 / image.height);
              const width = image.width * scale;
              const height = image.height * scale;
              context.drawImage(image, 78 + (146 - width) / 2, y + 12 + (146 - height) / 2, width, height);
              context.restore();
            } finally {
              URL.revokeObjectURL(photoUrl);
            }
          } else {
            context.fillStyle = imageSurfaceAlt;
            context.fillRect(78, y + 12, 146, 146);
            context.fillStyle = imageMuted;
            context.font = "18px Arial, sans-serif";
            context.fillText("SEM FOTO", 116, y + 91);
          }
          context.fillStyle = imageText;
          context.font = "bold 32px Arial, sans-serif";
          context.fillText(product.name.slice(0, 39), 250, y + 71, 730);
          context.fillStyle = imagePalette.pale;
          context.font = "bold 32px Arial, sans-serif";
          context.fillText(money(pricesById.get(product.id) ?? product.priceCents), 250, y + 125);
          if (product.category?.name) {
            context.fillStyle = imageMuted;
            context.font = "19px Arial, sans-serif";
            context.fillText(product.category.name.slice(0, 42), 250, y + 153, 730);
          }
        }
        context.fillStyle = imagePalette.accent;
        context.fillRect(68, 1790, 944, 2);
        context.fillStyle = imagePalette.pale;
        context.font = "24px Arial, sans-serif";
        context.fillText(formatPhoneForDisplay(user?.phone) || "Peça pelo WhatsApp", 70, 1832, 920);
        const blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob((value) => value ? resolve(value) : reject(new Error("Falha ao gerar o PNG.")), "image/png"),
        );
        const safeName = (customerName || "geral").toLowerCase().replace(/[^a-z0-9]+/g, "-");
        generated.push(new File([blob], `naker-cardapio-${safeName}-${pageIndex + 1}.png`, { type: "image/png" }));
      }
      setMenuFiles(generated);
      setMessage(`Cardápio pronto em ${generated.length} ${generated.length === 1 ? "imagem" : "imagens"}. As fotos usadas são as que estão salvas neste aparelho.`);
    } catch (e: any) {
      setMessage(e.message || "Não foi possível gerar o cardápio.");
    } finally {
      setGeneratingMenu(false);
    }
  }
  async function shareMenuImages() {
    if (!menuFiles.length) return;
    try {
      if (navigator.share && navigator.canShare?.({ files: menuFiles })) {
        await navigator.share({
          files: menuFiles,
          title: "Cardápio Naker",
          text: "Confira nosso cardápio.",
        });
        setMessage("Selecione o WhatsApp ou outro app para enviar as imagens.");
        return;
      }
      downloadMenuImages();
      setMessage("Imagens baixadas. Anexe os arquivos à conversa no WhatsApp.");
    } catch (e: any) {
      if (e?.name !== "AbortError") setMessage("Não foi possível abrir o compartilhamento. Tente baixar as imagens.");
    }
  }
  function downloadMenuImages() {
    menuFiles.forEach((file, index) => {
      const url = URL.createObjectURL(file);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = file.name;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000 + index * 300);
    });
  }
  async function logout() {
    await fetch(`${API}/api/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    localStorage.clear();
    setToken("");
    setUser(null);
  }
  if (!token)
    return (
      <main className="min-h-screen grid place-items-center p-4">
        <Toaster position="top-right" theme={themeMode} duration={3500} toastOptions={{ style: { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--panel-border)" } }} />
        <section className="panel fade w-full max-w-md rounded-3xl p-7 sm:p-10">
          <Brand />
          <h1 className="serif mt-10 text-3xl">
            {login ? "Acesse seu painel" : "Crie sua conta"}
          </h1>
          <p className="mt-2 text-sm text-[#aaa69b]">
            Seu catálogo de vendas, com presença imperial.
          </p>
          <form onSubmit={enter} className="mt-7 space-y-4">
            {!login && (
              <input
                className="field"
                placeholder="Nome do distribuidor"
                required
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            )}
            <input
              className="field"
              type="email"
              placeholder="E-mail"
              required
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            {!login && (
              <input
                className="field"
                type="tel"
                inputMode="tel"
                placeholder="+ 55 (11) 9 1234-5678 · opcional"
                value={form.phone ?? ""}
                onChange={(e) => setForm({ ...form, phone: formatPhoneForInput(e.target.value) })}
              />
            )}
            <input
              className="field"
              type="password"
              minLength={8}
              placeholder="Senha (mínimo 8 caracteres)"
              required
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <Button
              type="submit"
              disabled={busy}
              className="gold-button w-full rounded-xl py-3"
            >
              {busy ? "Aguarde…" : login ? "Entrar" : "Criar conta"}
            </Button>
          </form>
          <button
            onClick={() => setLogin(!login)}
            className="mt-5 w-full text-sm text-[#f5e6a8]"
          >
            {login
              ? "Ainda não tem conta? Cadastre-se"
              : "Já tem conta? Entrar"}
          </button>
          {login && (
            <button
              onClick={async () => {
                const email = prompt(
                  "Digite seu e-mail para receber o link de recuperação",
                );
                if (email) {
                  try {
                    const r = await fetch(`${API}/api/auth/forgot-password`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ email }),
                    });
                    const d = await r.json();
                    setMessage(
                      d.message ||
                        "Se o cadastro existir, enviaremos as instruções.",
                    );
                  } catch {
                    setMessage(
                      "Não foi possível solicitar a recuperação agora.",
                    );
                  }
                }
              }}
              className="mt-3 w-full text-sm text-[#aaa69b]"
            >
              Esqueci minha senha
            </button>
          )}
        </section>
      </main>
    );
  const nav = [
    ["Visão geral", LayoutDashboard],
    ["Produtos", Package],
    ["Clientes", Users],
    ["Cardápio", ImagePlus],
    ["Configurações", Settings],
  ] as const;
  const filtered = products
    .filter(
      (p) =>
        p.name.toLowerCase().includes(search.toLowerCase()) &&
        (categoryFilter === "all" || (categoryFilter === "uncategorized" ? !p.category : p.category?.name === categoryFilter)) &&
        (statusFilter === "all" || (statusFilter === "active" ? p.active !== false : p.active === false)),
    )
    .sort((a, b) => {
      if (sort === "price-asc") return a.priceCents - b.priceCents;
      if (sort === "price-desc") return b.priceCents - a.priceCents;
      if (sort === "newest") return (b.createdAt || "").localeCompare(a.createdAt || "");
      return a.name.localeCompare(b.name, "pt-BR");
    });
  const filteredCustomers = customers.filter((customer) =>
    customer.name.toLocaleLowerCase("pt-BR").includes(customerSearch.trim().toLocaleLowerCase("pt-BR")),
  );
  const dirtyPriceCount = prices.filter((product: any) => {
    const value = customerPriceValues[product.id];
    const numeric = Number(value);
    return value !== undefined && (!value.trim() || !Number.isFinite(numeric) || numeric < 0 || Math.round(numeric * 100) !== savedCustomerPriceCents[product.id]);
  }).length;
  return (
    <div className="min-h-screen md:flex">
      <aside
        className={`${menu ? "block" : "hidden"} fixed inset-y-0 left-0 z-30 w-72 border-r border-[#413719] bg-[#10100f] p-6 md:block`}
      >
        <Brand small />
        <div className="mt-12 space-y-2">
          {nav.map(([n, I]) => (
            <button
              key={n}
              aria-current={tab === n ? "page" : undefined}
              onClick={() => {
                setTab(n);
                setMenu(false);
                setSelected(null);
              }}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left ${tab === n ? "bg-[#d4af3717] text-[#f5e6a8]" : "text-[#aaa69b] hover:bg-white/5"}`}
            >
              <I size={18} />
              {n}
            </button>
          ))}
        </div>
        <div className="absolute bottom-6 left-6 right-6">
          <button
            onClick={logout}
            className="flex items-center gap-3 p-3 text-sm text-[#aaa69b]"
          >
            <LogOut size={17} /> Sair da conta
          </button>
        </div>
      </aside>
      <main className="min-h-screen flex-1 md:ml-72">
        <Toaster position="top-right" theme={themeMode} duration={3500} toastOptions={{ style: { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--panel-border)" } }} />
        <header className="sticky top-0 z-20 flex h-[76px] items-center justify-between border-b border-[#302b1e] bg-[#0a0a0a]/90 px-4 backdrop-blur sm:px-8">
          <div className="flex items-center gap-3">
            <button className="md:hidden" onClick={() => setMenu(!menu)}>
              {menu ? <X /> : <Menu />}
            </button>
            <div>
              <p className="serif text-xl">{tab}</p>
              <p className="hidden text-xs text-[#aaa69b] sm:block">
                Olá, {user?.name || "Distribuidor"} — organize seu negócio.
              </p>
            </div>
          </div>
          {tab !== "Cardápio" && tab !== "Configurações" && (
            <button
              className="gold-button rounded-xl px-4 py-2 text-sm"
              onClick={() => {
                setShow(true);
                setForm({});
                setPendingPhoto(null);
              }}
            >
              <Plus className="mr-1 inline" size={16} />
              {tab === "Clientes" ? "Novo cliente" : "Novo produto"}
            </button>
          )}
        </header>
        <div className="p-4 sm:p-8">
          <div className="mb-6 rounded-2xl border border-[#5b4b20] bg-gradient-to-r from-[#1c190f] to-[#10100f] p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs tracking-[.18em] text-[#d4af37]">
                  NAKER DISTRIBUIDOR
                </p>
                <h2 className="serif mt-1 text-2xl">
                  Seu negócio, em destaque.
                </h2>
                <p className="mt-1 text-sm text-[#aaa69b]">
                  Compartilhe seu catálogo e receba pedidos com facilidade.
                </p>
              </div>
              <button
                onClick={async () => {
                  const link = `${location.origin}/catalogo/${user?.slug}`;
                  if (await copyText(link)) setMessage("Link do catálogo copiado.");
                  else {
                    window.prompt("Não foi possível copiar automaticamente. Copie o link abaixo:", link);
                    setMessage("Copie o link exibido para compartilhar o catálogo.");
                  }
                }}
                className="rounded-xl border border-[#806b2c] px-4 py-3 text-sm text-[#f5e6a8]"
              >
                <Share2 className="mr-2 inline" size={16} />
                Copiar catálogo
              </button>
            </div>
          </div>
          {tab === "Visão geral" && (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                {[
                  [Package, "Produtos", products.length],
                  [Users, "Clientes", customers.length],
                  [ArrowUpRight, "Catálogo público", "Ativo"],
                ].map(([Icon, label, value]: any) => (
                  <div className="panel rounded-2xl p-5" key={label}>
                    <Icon className="text-[#d4af37]" size={21} />
                    <p className="mt-4 text-sm text-[#aaa69b]">{label}</p>
                    <p className="serif mt-1 text-2xl">{value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-8">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="serif text-xl">Produtos recentes</h3>
                  <button
                    onClick={() => setTab("Produtos")}
                    className="text-sm text-[#f5e6a8]"
                  >
                    Ver todos →
                  </button>
                </div>
                <Products
                  items={products.slice(0, 4)}
                  localPhotos={localPhotos}
                  onEdit={editProduct}
                  onPhotoChange={changeLocalPhoto}
                  onRemovePhoto={removeLocalPhoto}
                  onDelete={(id: string) => {
                    const p = products.find((product) => product.id === id);
                    if (p) askDelete("product", p.id, p.name);
                  }}
                />
              </div>
            </>
          )}
          {tab === "Produtos" && (
            <>
              <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(220px,1.4fr)_minmax(220px,1.2fr)_minmax(170px,.8fr)_minmax(180px,.9fr)]">
                <div className="relative min-w-0">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aaa69b]"
                    size={17}
                  />
                  <input
                    className="field field-search"
                    placeholder="Buscar produtos…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex min-w-0 items-center gap-2">
                  <SearchableSelect
                    className="min-w-0 flex-1"
                    value={categoryFilter}
                    onChange={setCategoryFilter}
                    placeholder="Buscar categoria…"
                    options={[
                      { value: "all", label: "Todas as categorias" },
                      ...categories.map((category) => ({ value: category.name, label: category.name })),
                      { value: "uncategorized", label: "Sem categoria" },
                    ]}
                  />
                  <button
                    type="button"
                    onClick={addCategory}
                    title="Adicionar ou excluir categorias"
                    aria-label="Adicionar ou excluir categorias"
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#806b2c] bg-[#17150f] text-[#f5e6a8] transition hover:bg-[#241f11]"
                  >
                    <Tags size={18} />
                  </button>
                </div>
                <ChoiceSelect
                  className="min-w-40 flex-1 sm:flex-none"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  label="Filtrar por status"
                  options={[
                    { value: "all", label: "Todos os status" },
                    { value: "active", label: "Ativos" },
                    { value: "inactive", label: "Inativos" },
                  ]}
                />
                <ChoiceSelect
                  className="min-w-40 flex-1 sm:flex-none"
                  value={sort}
                  onChange={setSort}
                  label="Ordenar produtos"
                  options={[
                    { value: "name", label: "Nome A–Z" },
                    { value: "price-asc", label: "Menor preço" },
                    { value: "price-desc", label: "Maior preço" },
                    { value: "newest", label: "Mais recentes" },
                  ]}
                />
              </div>
              <Products
                items={filtered}
                localPhotos={localPhotos}
                onEdit={editProduct}
                onPhotoChange={changeLocalPhoto}
                onRemovePhoto={removeLocalPhoto}
                onDelete={(id: string) => {
                  const p = products.find((product) => product.id === id);
                  if (p) askDelete("product", p.id, p.name);
                }}
              />
            </>
          )}
          {tab === "Clientes" && (
            <div className="grid gap-5 lg:grid-cols-[.75fr_1.25fr]">
              <section className="panel rounded-2xl p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <h3 className="serif text-xl">Seus clientes</h3>
                  <span className="text-xs text-[#aaa69b]">{filteredCustomers.length} de {customers.length}</span>
                </div>
                <div className="relative mb-3">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#aaa69b]" size={17} />
                  <input className="field field-search" placeholder="Buscar cliente pelo nome…" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} />
                </div>
                {filteredCustomers.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between border-b border-white/5 py-3"
                  >
                    <button
                      className="text-left"
                      onClick={() => selectCustomer(c)}
                    >
                      <span className="block">{c.name}</span>
                      <span className="text-xs text-[#aaa69b]">{formatPhoneForDisplay(c.phone)}</span>
                    </button>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        role="switch"
                        aria-checked={c.linkActive}
                        aria-label={`${c.linkActive ? "Desativar" : "Ativar"} link público de ${c.name}`}
                        onClick={() => setCustomerLinkActive(c, !c.linkActive)}
                        className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] focus-visible:ring-offset-2 focus-visible:ring-offset-[#111] ${c.linkActive ? "border-[#d4af37] bg-[#806b2c]" : "border-[#514b3a] bg-[#292929]"}`}
                      >
                        <span className={`absolute left-[3px] top-[3px] h-5 w-5 rounded-full bg-[#f5f5f0] shadow transition-transform ${c.linkActive ? "translate-x-5" : "translate-x-0"}`} />
                      </button>
                      <button
                        onClick={() => copyCustomerLink(c)}
                        disabled={!c.linkActive}
                        className="rounded-lg border border-[#5b4b20] p-2 text-[#f5e6a8] transition hover:bg-[#241f11] disabled:cursor-not-allowed disabled:opacity-40"
                        title={c.linkActive ? "Copiar link do cliente" : "Ative o link para copiar"}
                        aria-label={`Copiar link público de ${c.name}`}
                      >
                        <Copy size={16} />
                      </button>
                      <button
                        onClick={() => editCustomer(c)}
                        className="rounded-lg border border-[#48412f] px-2 text-xs"
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => askDelete("customer", c.id, c.name)}
                        className="rounded-lg border border-[#48412f] p-2 text-[#aaa69b]"
                        title="Excluir cliente"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
                {!customers.length && (
                  <p className="py-8 text-center text-sm text-[#aaa69b]">
                    Cadastre seu primeiro cliente.
                  </p>
                )}
                {!!customers.length && !filteredCustomers.length && (
                  <p className="py-8 text-center text-sm text-[#aaa69b]">Nenhum cliente encontrado com esse nome.</p>
                )}
              </section>
              <section className="panel rounded-2xl p-4">
                {selected ? (
                  <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="serif text-xl">
                          Preços · {selected.name}
                        </h3>
                        <p className="text-xs text-[#aaa69b]">
                          Ajuste e salve o preço de cada produto separadamente.
                        </p>
                      </div>
                      <button
                        className="gold-button min-h-11 rounded-xl px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-45"
                        disabled={!dirtyPriceCount || savingPrices}
                        onClick={saveChangedPrices}
                      >
                        {savingPrices ? "Salvando…" : dirtyPriceCount ? `Salvar alterações (${dirtyPriceCount})` : "Tudo salvo"}
                      </button>
                    </div>
                    <div className="mt-4 divide-y divide-white/5">
                      {prices.map((p: any) => (
                        <div key={p.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-3">
                          <span className="min-w-0">
                            <span className="block truncate text-sm">
                              {p.name}
                            </span>
                            <span className="text-xs text-[#aaa69b]">
                              Base {money(p.priceCents)}
                            </span>
                            {customerPriceValues[p.id] !== undefined && Math.round(Number(customerPriceValues[p.id]) * 100) !== savedCustomerPriceCents[p.id] && (
                              <span className="ml-2 text-xs text-[#f5e6a8]">Alterado</span>
                            )}
                          </span>
                          <label className="block text-xs text-[#aaa69b]">
                            <span className="block">Preço do cliente</span>
                            <input
                              className="field mt-1 block !w-[90px] px-2 py-2 text-right text-sm text-[#f5e6a8] sm:!w-28"
                              type="number"
                              min="0"
                              step="0.01"
                              value={customerPriceValues[p.id] ?? (p.priceCents / 100).toFixed(2)}
                              onChange={(e) => setCustomerPriceValues((current) => ({ ...current, [p.id]: e.target.value }))}
                            />
                          </label>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="grid min-h-48 place-items-center text-center text-sm text-[#aaa69b]">
                    Selecione um cliente para editar seus preços.
                    <br />O preço base é usado quando não há ajuste.
                  </div>
                )}
              </section>
            </div>
          )}
          {tab === "Configurações" && (
            <section className="panel max-w-2xl rounded-2xl p-5 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="rounded-xl border border-[#806b2c] bg-[#d4af3717] p-3 text-[#f5e6a8]"><Settings /></div>
                <div>
                  <h2 className="serif text-2xl">Contato para pedidos</h2>
                  <p className="mt-2 text-sm leading-6 text-[#aaa69b]">Esse WhatsApp será usado pelo botão “Pedir pelo WhatsApp” nos catálogos públicos e aparecerá nos cardápios gerados.</p>
                </div>
              </div>
              <form onSubmit={saveContactPhone} className="mt-6 space-y-4">
                <label className="block text-sm text-[#aaa69b]">
                  WhatsApp do distribuidor
                  <input className="field mt-2" type="tel" inputMode="tel" placeholder="+ 55 (11) 9 1234-5678" value={contactPhone} onChange={(e) => setContactPhone(formatPhoneForInput(e.target.value))} />
                </label>
                <p className="text-xs text-[#aaa69b]">Digite o DDD e o número. O código +55 aparece automaticamente.</p>
                <button className="gold-button min-h-12 rounded-xl px-5 py-3">Salvar WhatsApp</button>
              </form>
              <div className="mt-8 border-t border-white/10 pt-7">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl border border-[#806b2c] bg-[#d4af3717] p-3 text-[#f5e6a8]"><Settings size={20} /></div>
                  <div>
                    <h3 className="serif text-xl">Personalizar aparência</h3>
                    <p className="mt-1 text-sm leading-6 text-[#aaa69b]">Escolha o modo e a cor de destaque do painel. As opções mantêm texto e controles com contraste confortável.</p>
                  </div>
                </div>
                <div className="mt-6 grid gap-6 lg:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-medium">Modo de exibição</p>
                  <div className="grid grid-cols-2 gap-3">
                    {([
                      ["dark", "Escuro", Moon],
                      ["light", "Claro", Sun],
                    ] as const).map(([value, label, Icon]) => (
                      <button key={value} type="button" aria-pressed={themeMode === value} onClick={() => setThemeMode(value)} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${themeMode === value ? "border-[#d4af37] bg-[#d4af3717] text-[#f5e6a8]" : "border-white/15 text-[#aaa69b] hover:border-white/30"}`}>
                        <Icon size={17} />{label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="mb-2 text-sm font-medium">Cor de destaque</p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 lg:grid-cols-1">
                    {([
                      ["gold", "Dourado", "#d4af37", "#f5e6a8"],
                      ["blue", "Azul", "#2563eb", "#bfdbfe"],
                      ["emerald", "Verde", "#047857", "#a7f3d0"],
                    ] as const).map(([value, label, color, pale]) => (
                      <button key={value} type="button" aria-pressed={accentColor === value} onClick={() => setAccentColor(value)} className={`flex min-h-12 items-center gap-3 rounded-xl border px-4 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d4af37] ${accentColor === value ? "border-white/60 bg-white/5 text-[#f5f5f0]" : "border-white/15 text-[#aaa69b] hover:border-white/30"}`}>
                        <span className="h-5 w-5 rounded-full border border-white/30" style={{ background: `linear-gradient(135deg, ${color}, ${pale})` }} />
                        {label}
                        {accentColor === value && <span className="ml-auto text-xs text-[#aaa69b]">Selecionada</span>}
                      </button>
                    ))}
                  </div>
                </div>
                </div>
                <button type="button" onClick={saveAppearance} disabled={savingAppearance} className="gold-button mt-5 min-h-12 rounded-xl px-5 py-3 disabled:cursor-wait disabled:opacity-60">
                  {savingAppearance ? "Salvando…" : "Salvar aparência"}
                </button>
              </div>
            </section>
          )}
          {tab === "Cardápio" && (
            <section className="panel rounded-2xl p-5 sm:p-8">
              <div className="flex items-start gap-4">
                <div className="rounded-xl border border-[#806b2c] bg-[#d4af3717] p-3 text-[#f5e6a8]"><ImagePlus /></div>
                <div>
                  <h2 className="serif text-2xl">Monte seu cardápio em imagens</h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#aaa69b]">
                    Escolha um cliente para conferir os preços dele. Depois, confira os produtos abaixo e gere as imagens para enviar pelo WhatsApp.
                  </p>
                </div>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                <label className="block text-sm text-[#aaa69b]">
                  Preços do cardápio
                  <SearchableSelect
                    className="mt-2"
                    value={menuCustomerId}
                    onChange={chooseMenuCustomer}
                    placeholder="Digite ou escolha um cliente…"
                    emptyMessage="Nenhum cliente encontrado."
                    options={[
                      { value: "", label: "Catálogo geral · preço base" },
                      ...customers.map((customer) => ({ value: customer.id, label: customer.name })),
                    ]}
                  />
                </label>
                <button onClick={generateMenu} disabled={generatingMenu || !products.length} className="gold-button flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3 disabled:opacity-50">
                  <ImagePlus size={18} /> {generatingMenu ? "Gerando…" : "Gerar cardápio"}
                </button>
              </div>
              {menuFiles.length > 0 && (
                <div className="mt-6 rounded-xl border border-[#5b4b20] bg-black/20 p-4">
                  <p className="font-medium text-[#f5e6a8]">{menuFiles.length} {menuFiles.length === 1 ? "imagem pronta" : "imagens prontas"}</p>
                  <p className="mt-1 text-sm text-[#aaa69b]">No celular, compartilhar abre as opções de envio. No computador, você também pode baixar e anexar no WhatsApp Web.</p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <button onClick={shareMenuImages} className="gold-button flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 py-3"><Share2 size={18} /> Compartilhar imagem</button>
                    <button onClick={downloadMenuImages} className="flex min-h-12 items-center justify-center gap-2 rounded-xl border border-[#806b2c] px-5 py-3 text-[#f5e6a8]"><Download size={18} /> Baixar {menuFiles.length > 1 ? "imagens" : "imagem"}</button>
                  </div>
                </div>
              )}
              <div className="mt-8">
                <h3 className="serif text-xl">Fotos dos produtos</h3>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-[#aaa69b]">
                  As fotos ficam salvas neste aparelho e navegador. Em outro dispositivo, escolha as fotos novamente.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {products.map((product) => (
                    <div key={product.id} className="overflow-hidden rounded-xl border border-[#48412f] bg-[#111]">
                      <div className="aspect-square bg-[#191919]">
                        {localPhotos[product.id] ? <img src={localPhotos[product.id]} alt={product.name} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-sm text-[#aaa69b]">Sem foto neste aparelho</div>}
                      </div>
                      <div className="p-3">
                        <p className="truncate text-sm">{product.name}</p>
                        <p className="mt-1 font-semibold text-[#f5e6a8]">
                          {loadingMenuPrices && menuCustomerId ? "Carregando preço…" : money(menuPriceCents[product.id] ?? product.priceCents)}
                        </p>
                        {menuCustomerId && menuPriceCents[product.id] !== undefined && menuPriceCents[product.id] !== product.priceCents && (
                          <p className="mt-0.5 text-xs text-[#aaa69b]">Preço geral: {money(product.priceCents)}</p>
                        )}
                        {product.active === false && <p className="mt-1 text-xs text-[#aaa69b]">Inativo · não aparece no cardápio</p>}
                        <label className="mt-2 flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#806b2c] px-2 text-xs text-[#f5e6a8]">
                          <Camera size={15} /> {localPhotos[product.id] ? "Trocar foto" : "Escolher foto"}
                          <input className="sr-only" type="file" accept="image/*" onChange={(e) => { changeLocalPhoto(product.id, e.target.files?.[0]); e.currentTarget.value = ""; }} />
                        </label>
                        {localPhotos[product.id] && <button onClick={() => removeLocalPhoto(product.id)} className="mt-2 w-full py-1 text-xs text-[#aaa69b]">Remover foto deste aparelho</button>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>
      </main>
      {(show || editor) && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4"
          onClick={() => { setShow(false); setEditor(null); setPendingPhoto(null); }}
        >
          <section
            className="panel max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex justify-between">
              <h3 className="serif text-2xl">
                {editor ? (editor.type === "customer" ? "Editar cliente" : "Editar produto") : (tab === "Clientes" ? "Novo cliente" : "Novo produto")}
              </h3>
              <button onClick={() => { setShow(false); setEditor(null); setPendingPhoto(null); }}>
                <X />
              </button>
            </div>
            <form
              onSubmit={editor?.type === "customer" || (!editor && tab === "Clientes") ? saveCustomer : saveProduct}
              className="space-y-3"
            >
              {editor?.type === "customer" || (!editor && tab === "Clientes") ? (
                <>
                  <input
                    className="field"
                    placeholder="Nome do cliente"
                    required
                    value={form.name ?? ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <input
                    className="field"
                    type="tel"
                    inputMode="tel"
                    placeholder="Telefone / WhatsApp"
                    required
                    value={form.phone ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, phone: formatPhoneForInput(e.target.value) })
                    }
                  />
                  <textarea
                    className="field"
                    placeholder="Observações"
                    value={form.notes ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, notes: e.target.value })
                    }
                  />
                </>
              ) : (
                <>
                  <input
                    className="field"
                    placeholder="Nome do produto"
                    required
                    value={form.name ?? ""}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                  <input
                    className="field"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Preço (R$)"
                    required
                    value={form.price ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, price: e.target.value })
                    }
                  />
                  <SearchableSelect
                    value={form.categoryId ?? ""}
                    onChange={(value) => setForm({ ...form, categoryId: value || undefined })}
                    placeholder="Buscar categoria…"
                    options={[
                      { value: "", label: "Sem categoria" },
                      ...categories.map((category) => ({ value: category.id, label: category.name })),
                    ]}
                  />
                  <div className="grid gap-2 sm:grid-cols-2">
                    <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#806b2c] px-4 py-3 text-sm text-[#f5e6a8]">
                      <Camera size={18} /> Escolher da galeria
                      <input className="sr-only" type="file" accept="image/*" onChange={(e) => { setPendingPhoto(e.target.files?.[0] ?? null); e.currentTarget.value = ""; }} />
                    </label>
                    <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-[#806b2c] px-4 py-3 text-sm text-[#f5e6a8]">
                      <Camera size={18} /> Tirar foto agora
                      <input className="sr-only" type="file" accept="image/*" capture="environment" onChange={(e) => { setPendingPhoto(e.target.files?.[0] ?? null); e.currentTarget.value = ""; }} />
                    </label>
                  </div>
                  {pendingPhoto && <p className="truncate text-xs text-[#f5e6a8]">Foto selecionada: {pendingPhoto.name}</p>}
                  <p className="text-xs text-[#aaa69b]">A foto fica neste navegador, não é enviada ao banco. Se trocar de aparelho, será necessário escolher a foto novamente.</p>
                  <input
                    className="field"
                    placeholder="Descrição (opcional)"
                    value={form.description ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                  <label className="block pb-2 text-sm text-[#aaa69b]">Status do produto
                    <ChoiceSelect
                      className="mt-2"
                      value={form.active === false ? "inactive" : "active"}
                      onChange={(value) => setForm({ ...form, active: value === "active" })}
                      label="Status do produto"
                      openUpwards
                      options={[
                        { value: "active", label: "Ativo" },
                        { value: "inactive", label: "Inativo" },
                      ]}
                    />
                  </label>
                </>
              )}
              <div className="pt-2">
                <button className="gold-button w-full rounded-xl py-3">
                  Salvar
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
      {deleteTarget && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/75 p-4" onClick={() => setDeleteTarget(null)}>
          <section role="alertdialog" aria-modal="true" aria-labelledby="delete-title" className="panel w-full max-w-md rounded-2xl p-6" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-full border border-red-900/70 bg-red-950/50 p-3 text-red-300"><Trash2 size={20} /></div>
              <h3 id="delete-title" className="serif text-2xl">Confirmar exclusão</h3>
            </div>
            <p className="text-sm leading-6 text-[#c9c7bf]">
              Tem certeza que deseja excluir <strong className="text-[#f5f5f0]">{deleteTarget.name}</strong>? {deleteTarget.type === "category" ? "Os produtos dessa categoria continuam cadastrados, mas ficarão sem categoria." : "Essa ação não pode ser desfeita."}
            </p>
            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button onClick={() => setDeleteTarget(null)} className="min-h-11 rounded-xl border border-[#48412f] px-5 text-sm">Cancelar</button>
              <button onClick={confirmDelete} className="min-h-11 rounded-xl bg-red-800 px-5 text-sm font-semibold text-white hover:bg-red-700">Excluir {deleteTarget.type === "product" ? "produto" : deleteTarget.type === "customer" ? "cliente" : "categoria"}</button>
            </div>
          </section>
        </div>
      )}
      {showCategoryManager && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm" onClick={() => setShowCategoryManager(false)}>
          <section role="dialog" aria-modal="true" aria-labelledby="manage-categories-title" className="panel max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl p-6 sm:p-7" onClick={(e) => e.stopPropagation()}>
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs tracking-[.18em] text-[#d4af37]">ORGANIZAÇÃO</p>
                <h3 id="manage-categories-title" className="serif mt-1 text-2xl">Categorias</h3>
                <p className="mt-2 text-sm text-[#aaa69b]">Adicione categorias ou exclua as que não usa mais.</p>
              </div>
              <button type="button" aria-label="Fechar" onClick={() => setShowCategoryManager(false)} className="rounded-lg p-2 text-[#aaa69b] hover:bg-white/5 hover:text-white"><X size={20} /></button>
            </div>
            <form onSubmit={saveCategory} className="mb-5 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
              <input autoFocus className="field" minLength={2} maxLength={60} required value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Nome da nova categoria" aria-label="Nome da nova categoria" />
              <button disabled={categoryName.trim().length < 2} className="gold-button flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm disabled:opacity-50"><Plus size={17} /> Adicionar</button>
            </form>
            <div className="divide-y divide-white/5 rounded-xl border border-[#48412f] bg-[#10100f] px-4">
              {categories.map((category) => {
                const productCount = products.filter((product) => product.categoryId === category.id).length;
                return (
                  <div key={category.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm text-[#f5f5f0]">{category.name}</p>
                      <p className="mt-0.5 text-xs text-[#aaa69b]">{productCount} {productCount === 1 ? "produto" : "produtos"}</p>
                    </div>
                    <button onClick={() => askDelete("category", category.id, category.name)} className="flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-red-950 px-3 text-xs text-red-300 transition hover:bg-red-950/40" aria-label={`Excluir categoria ${category.name}`}>
                      <Trash2 size={15} /> Excluir
                    </button>
                  </div>
                );
              })}
              {!categories.length && <p className="py-8 text-center text-sm text-[#aaa69b]">Ainda não há categorias para gerenciar.</p>}
            </div>
            <div className="mt-5 flex justify-end">
              <button type="button" onClick={() => setShowCategoryManager(false)} className="min-h-11 rounded-xl border border-[#48412f] px-5 text-sm">Fechar</button>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
function Products({
  items,
  localPhotos,
  onPhotoChange,
  onRemovePhoto,
  onDelete,
  onEdit,
}: {
  items: Product[];
  localPhotos: Record<string, string>;
  onPhotoChange: (id: string, file?: File) => void;
  onRemovePhoto: (id: string) => void;
  onDelete: (id: string) => void;
  onEdit: (p: Product) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
      {items.map((p) => (
        <article key={p.id} className="panel overflow-hidden rounded-2xl">
          <div className="relative aspect-square bg-[#111]">
            {localPhotos[p.id] ? (
              <img src={localPhotos[p.id]} alt={p.name} className="h-full w-full object-cover" />
            ) : p.imageUrl ? (
              <img
                src={p.imageUrl.startsWith("http") ? p.imageUrl : `${API}${p.imageUrl}`}
                alt={p.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-[#aaa69b]">Sem foto</div>
            )}
            <div className="absolute right-2 top-2 flex gap-1">
              <label className="cursor-pointer rounded-lg bg-black/70 p-2 text-white" aria-label="Escolher foto neste aparelho" title="Escolher foto neste aparelho">
                <Camera size={16} />
                <input className="sr-only" type="file" accept="image/*" onChange={(e) => { onPhotoChange(p.id, e.target.files?.[0]); e.currentTarget.value = ""; }} />
              </label>
              <button
                onClick={() => onEdit(p)}
                className="rounded-lg bg-black/70 p-2 text-white"
                aria-label="Editar produto"
              >
                <Pencil size={16} />
              </button>
              <button
                onClick={() => onDelete(p.id)}
                className="rounded-lg bg-black/70 p-2 text-white"
                aria-label="Excluir produto"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
          <div className="p-3">
            <p className="truncate text-sm">{p.name}</p>
            <p className="gold-text mt-1 font-semibold">
              {money(p.priceCents)}
            </p>
            {localPhotos[p.id] && <button onClick={() => onRemovePhoto(p.id)} className="mt-2 text-xs text-[#aaa69b]">Remover foto local</button>}
          </div>
        </article>
      ))}
    </div>
  );
}
