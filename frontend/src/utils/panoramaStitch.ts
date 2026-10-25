const API_URL = import.meta.env.VITE_API_URL ?? '/api'

// Сервер всё равно уменьшает кадры до 1600 px: так 12 фото с телефона весят ~5 МБ вместо ~60.
const MAX_UPLOAD_SIDE = 1600

export const MIN_STITCH_PHOTOS = 2
export const MAX_STITCH_PHOTOS = 40
export const RECOMMENDED_STITCH_PHOTOS = 12

export interface StitchedPanorama {
  file: File
  horizontalCoverage: number
  verticalCoverage: number
  /** Номера снимков (с нуля), вошедших в панораму. */
  usedImages: number[]
  totalImages: number
}

export class StitchRequestError extends Error {}

async function prepareForUpload(file: File): Promise<Blob> {
  // createImageBitmap учитывает EXIF-ориентацию снимков с телефона.
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_UPLOAD_SIDE / Math.max(bitmap.width, bitmap.height))
  if (scale === 1 && file.type === 'image/jpeg') {
    bitmap.close()
    return file
  }
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) => canvas.toBlob(
    (blob) => blob ? resolve(blob) : reject(new StitchRequestError(`Не удалось подготовить снимок «${file.name}».`)),
    'image/jpeg', 0.92,
  ))
}

export async function stitchPanorama(files: File[], signal?: AbortSignal): Promise<StitchedPanorama> {
  const prepared = await Promise.all(files.map(prepareForUpload))
  const form = new FormData()
  prepared.forEach((blob, index) => form.append('images', blob, `photo-${index + 1}.jpg`))

  let response: Response
  try {
    response = await fetch(`${API_URL}/panoramas/stitch`, { method: 'POST', body: form, signal })
  } catch (error) {
    if (signal?.aborted) throw error
    throw new StitchRequestError('Сервер склейки недоступен. Проверьте, что backend запущен.')
  }

  if (!response.ok) {
    const detail = await response.json()
      .then((body: { detail?: unknown }) => typeof body.detail === 'string' ? body.detail : '')
      .catch(() => '')
    if (detail) throw new StitchRequestError(detail)
    throw new StitchRequestError(response.status >= 500
      ? 'Сервер склейки недоступен. Проверьте, что backend запущен.'
      : `Не удалось склеить панораму (ошибка ${response.status}).`)
  }

  const header = (name: string) => response.headers.get(name) ?? ''
  const blob = await response.blob()
  return {
    file: new File([blob], 'panorama-360.jpg', { type: 'image/jpeg' }),
    horizontalCoverage: Number(header('X-Panorama-Horizontal-Coverage')) || 0,
    verticalCoverage: Number(header('X-Panorama-Vertical-Coverage')) || 0,
    usedImages: header('X-Panorama-Used-Images').split(',').filter(Boolean).map(Number),
    totalImages: Number(header('X-Panorama-Total-Images')) || files.length,
  }
}
