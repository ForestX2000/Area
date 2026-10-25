
const DB_NAME = 'space-map-db'
const STORE_NAME = 'map-images'
const METADATA_STORE = 'map-metadata'

interface FileCacheMetadata {
  etag?: string
  timestamp: number
}

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
    const request = indexedDB.open(DB_NAME, 2)

    request.onupgradeneeded = () => {
      const db = request.result

      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }

      if (!db.objectStoreNames.contains(METADATA_STORE)) {
        db.createObjectStore(METADATA_STORE)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function getMetadata(db: IDBDatabase, key: string): Promise<FileCacheMetadata | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(METADATA_STORE, 'readonly')
    const request = transaction.objectStore(METADATA_STORE).get(key)
    request.onsuccess = () => resolve(request.result ?? null)
    request.onerror = () => reject(request.error)
  })
}

function putMetadata(transaction: IDBTransaction, key: string, metadata: FileCacheMetadata): void {
  transaction.objectStore(METADATA_STORE).put(metadata, key)
}

export async function saveMapImage(
  projectId: string,
  file: File,
  etag?: string,
): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, METADATA_STORE], 'readwrite')

    transaction.objectStore(STORE_NAME).put(file, projectId)
    putMetadata(transaction, projectId, { etag, timestamp: Date.now() })

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

export async function getMapImageETag(projectId: string): Promise<string | undefined> {
  const db = await openDatabase()
  const metadata = await getMetadata(db, projectId)
  db.close()
  return metadata?.etag
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
  etag?: string,
): Promise<void> {
  const db = await openDatabase()
  const key = `panorama:${projectId}:${pointId}`

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME, METADATA_STORE], 'readwrite')
    transaction.objectStore(STORE_NAME).put(file, key)
    putMetadata(transaction, key, { etag, timestamp: Date.now() })

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

export async function getPanoramaETag(projectId: string, pointId: string): Promise<string | undefined> {
  const db = await openDatabase()
  const key = `panorama:${projectId}:${pointId}`
  const metadata = await getMetadata(db, key)
  db.close()
  return metadata?.etag
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
