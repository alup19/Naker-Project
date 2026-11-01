const DB_NAME = "naker-distribuidor-local";
const STORE_NAME = "product-images";
const MAX_INPUT_SIZE = 10 * 1024 * 1024;
const MAX_EDGE = 1400;

function openImageDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !("indexedDB" in window)) {
    return Promise.reject(new Error("Este navegador não oferece armazenamento local de fotos."));
  }
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "productId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Não foi possível abrir as fotos locais."));
  });
}

function decodeImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível abrir essa foto.")); };
    image.src = url;
  });
}

async function optimize(file: File): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Escolha um arquivo de imagem.");
  if (file.size > MAX_INPUT_SIZE) throw new Error("A foto deve ter até 10 MB antes da otimização.");
  const image = await decodeImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível otimizar a foto neste navegador.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Não foi possível preparar a foto.")),
      "image/webp",
      0.82,
    );
  });
}

export async function saveLocalProductImage(productId: string, file: File) {
  const blob = await optimize(file);
  const db = await openImageDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).put({ productId, blob, updatedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Não foi possível salvar a foto neste aparelho."));
      tx.onabort = () => reject(tx.error ?? new Error("O aparelho não tem espaço disponível para salvar a foto."));
    });
  } finally {
    db.close();
  }
}

export async function getLocalProductImage(productId: string): Promise<Blob | null> {
  const db = await openImageDb();
  try {
    return await new Promise((resolve, reject) => {
      const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(productId);
      request.onsuccess = () => resolve((request.result?.blob as Blob | undefined) ?? null);
      request.onerror = () => reject(request.error ?? new Error("Não foi possível carregar a foto."));
    });
  } finally {
    db.close();
  }
}

export async function deleteLocalProductImage(productId: string) {
  const db = await openImageDb();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      tx.objectStore(STORE_NAME).delete(productId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error ?? new Error("Não foi possível remover a foto."));
    });
  } finally {
    db.close();
  }
}
