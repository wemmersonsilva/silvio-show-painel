// db.js - Camada de Persistência Local (IndexedDB) para o Painel Silvio Show
// Armazena configurações dos pads, arquivos de mídia binários (Blob/ArrayBuffer) e mídia de descanso do Telão.

const DB_NAME = 'SilvioShowStageDB';
const DB_VERSION = 1;
const STORE_PADS = 'pads';
const STORE_MEDIA = 'media_blobs';
const STORE_SETTINGS = 'settings';

class StageDatabase {
  constructor() {
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_PADS)) {
          db.createObjectStore(STORE_PADS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_MEDIA)) {
          db.createObjectStore(STORE_MEDIA, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_SETTINGS)) {
          db.createObjectStore(STORE_SETTINGS, { keyPath: 'key' });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('Erro ao abrir IndexedDB:', event.target.error);
        reject(event.target.error);
      };
    });
  }

  async getAllPads() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_PADS, 'readonly');
      const store = tx.objectStore(STORE_PADS);
      const req = store.getAll();
      req.onsuccess = () => {
        const pads = req.result || [];
        pads.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        resolve(pads);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async savePad(pad) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_PADS, 'readwrite');
      const store = tx.objectStore(STORE_PADS);
      const req = store.put(pad);
      req.onsuccess = () => resolve(pad);
      req.onerror = () => reject(req.error);
    });
  }

  async saveAllPads(pads) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_PADS, 'readwrite');
      const store = tx.objectStore(STORE_PADS);
      pads.forEach((pad) => store.put(pad));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async deletePad(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_PADS, STORE_MEDIA], 'readwrite');
      tx.objectStore(STORE_PADS).delete(id);
      tx.objectStore(STORE_MEDIA).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async saveMediaBlob(id, blob, mimeType, fileName) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_MEDIA, 'readwrite');
      const store = tx.objectStore(STORE_MEDIA);
      const req = store.put({
        id,
        blob,
        mimeType: mimeType || blob.type,
        fileName: fileName || id,
        updatedAt: Date.now()
      });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  async getMediaBlob(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_MEDIA, 'readonly');
      const store = tx.objectStore(STORE_MEDIA);
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }

  async getAllMediaBlobs() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_MEDIA, 'readonly');
      const store = tx.objectStore(STORE_MEDIA);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async getSetting(key, defaultValue = null) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_SETTINGS, 'readonly');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.get(key);
      req.onsuccess = () => {
        resolve(req.result ? req.result.value : defaultValue);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async setSetting(key, value) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction(STORE_SETTINGS, 'readwrite');
      const store = tx.objectStore(STORE_SETTINGS);
      const req = store.put({ key, value });
      req.onsuccess = () => resolve(value);
      req.onerror = () => reject(req.error);
    });
  }

  async clearAll() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction([STORE_PADS, STORE_MEDIA, STORE_SETTINGS], 'readwrite');
      tx.objectStore(STORE_PADS).clear();
      tx.objectStore(STORE_MEDIA).clear();
      tx.objectStore(STORE_SETTINGS).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

window.stageDB = new StageDatabase();
