export const DB_NAME = "JoelifyLocalFiles";
export const DB_VERSION = 1;
export const STORE_NAME = "tracks";

interface LocalFileTrack {
  id: string; // Will prefix with 'local-'
  title: string;
  artist: string;
  blob: Blob;
  duration: string;
  thumbnail?: string; // Optional if we want to extract ID3 tags later
}

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

export async function saveLocalFile(file: File): Promise<LocalFileTrack> {
  const db = await getDB();
  const id = `local-${crypto.randomUUID()}`;
  
  // Format the name slightly
  const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
  const parts = fileName.split("-").map(p => p.trim());
  const title = parts[1] || parts[0];
  const artist = parts.length > 1 ? parts[0] : "Local Artist";

  const track: LocalFileTrack = {
    id,
    title,
    artist,
    blob: file,
    duration: "0:00",
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(track);
    request.onsuccess = () => resolve(track);
    request.onerror = () => reject(request.error);
  });
}

export async function getLocalFiles(): Promise<LocalFileTrack[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteLocalFile(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readwrite");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getLocalFileBlob(id: string): Promise<Blob | null> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => {
      const track = request.result as LocalFileTrack;
      resolve(track ? track.blob : null);
    };
    request.onerror = () => reject(request.error);
  });
}