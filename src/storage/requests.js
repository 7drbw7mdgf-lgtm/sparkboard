export function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onabort = () =>
      reject(transaction.error || new Error('Storage transaction was aborted.'));
    transaction.onerror = () => {}; // onabort reports the final transaction failure.
  });
}

export async function readEntry(db, store, key) {
  const transaction = db.transaction(store);
  return requestResult(transaction.objectStore(store).get(key));
}

export async function readAll(db, store) {
  return requestResult(db.transaction(store).objectStore(store).getAll());
}
