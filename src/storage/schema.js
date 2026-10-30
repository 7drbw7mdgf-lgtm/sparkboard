export const DATABASE_NAME = 'sparkboard-workspace';
// Version 3 closes older editor connections before revision-protected writes begin.
export const DATABASE_VERSION = 3;
export const WRITE_STORES = ['boards', 'summaries', 'media', 'mediaRefs'];

export function openDatabase(factory = globalThis.indexedDB, name = DATABASE_NAME) {
  if (!factory)
    return Promise.reject(
      new Error('IndexedDB is unavailable. Your saved data has not been changed.'),
    );
  return new Promise((resolve, reject) => {
    const request = factory.open(name, DATABASE_VERSION);
    let blocked = false;
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Close older Sparkboard tabs, then reload to finish the storage upgrade.'));
    };
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const db = request.result;
      for (const name of ['boards', 'summaries', 'media']) {
        if (!db.objectStoreNames.contains(name)) db.createObjectStore(name, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings');
      if (!db.objectStoreNames.contains('mediaRefs')) {
        const refs = db.createObjectStore('mediaRefs', { keyPath: ['boardId', 'mediaId'] });
        refs.createIndex('byBoard', 'boardId');
        refs.createIndex('byMedia', 'mediaId');
      }
      // Keep v1's workspace store until the migration transaction has committed.
    };
    request.onsuccess = () => {
      if (blocked) {
        request.result.close();
        return;
      }
      resolve(request.result);
    };
  });
}
