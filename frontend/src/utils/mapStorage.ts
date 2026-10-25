
const DB_NAME = 'space-map-db'
const STORE_NAME = 'map-images'

export async function deleteFloorMedia(storageId: string, protectedStorageIds: string[] = []): Promise<void> {
  const db = await openDatabase()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    store.delete(storageId)
    const prefix = `panorama:${storageId}:`
    const protectedPrefixes = protectedStorageIds.map((id) => `panorama:${id}:`).filter((other) => other.startsWith(prefix))
    const request = store.openKeyCursor(IDBKeyRange.bound(prefix, `${prefix}\uffff`))
    request.onsuccess = () => {
      const cursor = request.result
      if (!cursor) return
      if (!protectedPrefixes.some((other) => String(cursor.primaryKey).startsWith(other))) store.delete(cursor.primaryKey)
      cursor.continue()
    }
    transaction.oncomplete = () => { db.close(); resolve() }
    transaction.onerror = () => { db.close(); reject(transaction.error) }
    transaction.onabort = () => { db.close(); reject(transaction.error) }
  })
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveMapImage(
  projectId: string,
  file: File,
): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')

    transaction.objectStore(STORE_NAME).put(file, projectId)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }

    transaction.onabort = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

export async function getMapImage(
  projectId: string,
): Promise<Blob | undefined> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(projectId)

    request.onsuccess = () => {
      db.close()
      resolve(request.result as Blob | undefined)
    }

    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function deleteMapImage(
  projectId: string,
): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(projectId)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }

    transaction.onabort = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

export async function savePanorama(
  projectId: string,
  pointId: string,
  file: File,
): Promise<void> {
  const db = await openDatabase()
  const key = `panorama:${projectId}:${pointId}`

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).put(file, key)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }

    transaction.onabort = () => {
      db.close()
      reject(transaction.error)
    }
  })
}

export async function getPanorama(
  projectId: string,
  pointId: string,
): Promise<Blob | undefined> {
  const db = await openDatabase()
  const key = `panorama:${projectId}:${pointId}`

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const request = transaction.objectStore(STORE_NAME).get(key)

    request.onsuccess = () => {
      const result = request.result as Blob | undefined
      db.close()
      resolve(result)
    }

    request.onerror = () => {
      db.close()
      reject(request.error)
    }
  })
}

export async function deletePanorama(
  projectId: string,
  pointId: string,
): Promise<void> {
  const db = await openDatabase()
  const key = `panorama:${projectId}:${pointId}`

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    transaction.objectStore(STORE_NAME).delete(key)

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }

    transaction.onerror = () => {
      db.close()
      reject(transaction.error)
    }
  })
}
