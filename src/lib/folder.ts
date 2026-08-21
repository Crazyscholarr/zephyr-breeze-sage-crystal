const DB_NAME = "framebox-idb";
const STORE = "kv";
const HANDLE_KEY = "save-folder";

export type DirHandle = FileSystemDirectoryHandle;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbDel(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

let cached: DirHandle | null = null;

export function canPickFolder(): boolean {
  return typeof window !== "undefined" && typeof window.showDirectoryPicker === "function";
}

export function getCachedFolder(): DirHandle | null {
  return cached;
}

export async function pickFolder(): Promise<DirHandle> {
  if (!canPickFolder()) {
    throw new Error("Trình duyệt không hỗ trợ chọn thư mục. Hãy dùng Chrome hoặc Edge.");
  }
  const handle = await window.showDirectoryPicker({
    id: "framebox-save",
    mode: "readwrite",
    startIn: "videos",
  });
  cached = handle;
  await idbSet(HANDLE_KEY, handle);
  return handle;
}

export async function restoreFolder(): Promise<DirHandle | null> {
  try {
    const handle = await idbGet<DirHandle>(HANDLE_KEY);
    if (!handle) return null;
    cached = handle;
    return handle;
  } catch {
    return null;
  }
}

export async function ensureFolderWrite(handle: DirHandle): Promise<boolean> {
  const opts = { mode: "readwrite" as const };
  if ((await handle.queryPermission(opts)) === "granted") return true;
  return (await handle.requestPermission(opts)) === "granted";
}

export async function clearFolder(): Promise<void> {
  cached = null;
  try {
    await idbDel(HANDLE_KEY);
  } catch {
    // ignore
  }
}

export async function writeToFolder(
  handle: DirHandle,
  filename: string,
  res: Response,
  onProgress: (p: { received: number; total: number }) => void,
  signal?: AbortSignal,
): Promise<void> {
  const file = await handle.getFileHandle(filename, { create: true });
  const writable = await file.createWritable();
  const total = Number(res.headers.get("content-length") || 0);
  try {
    if (!res.body) {
      const buf = await res.arrayBuffer();
      await writable.write(buf);
      onProgress({ received: buf.byteLength, total: buf.byteLength });
      await writable.close();
      return;
    }
    const reader = res.body.getReader();
    let received = 0;
    while (true) {
      if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        await writable.write(value);
        received += value.byteLength;
        onProgress({ received, total });
      }
    }
    await writable.close();
  } catch (err) {
    try {
      await writable.abort();
    } catch {
      // ignore
    }
    throw err;
  }
}
