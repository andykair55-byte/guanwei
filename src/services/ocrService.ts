/**
 * OCR service using Tesseract.js (lazy-loaded)
 * Extracts text from images entirely client-side — no server needed.
 */

let workerPromise: Promise<any> | null = null

function getWorker() {
  if (!workerPromise) {
    workerPromise = import('tesseract.js').then(({ createWorker }) =>
      createWorker('chi_sim+eng', 1, {
        logger: (m: any) => {
          if (m.status === 'recognizing text') {
            // progress callback — consumers can poll or we expose it
          }
        },
      })
    )
  }
  return workerPromise
}

export interface OcrResult {
  text: string
  confidence: number
}

export async function recognizeText(
  imageSource: string | File | Blob,
  onProgress?: (pct: number) => void,
): Promise<OcrResult> {
  const worker = await getWorker()

  if (onProgress) {
    await worker.setLogger((m: any) => {
      if (m.status === 'recognizing text' && typeof m.progress === 'number') {
        onProgress(Math.round(m.progress * 100))
      }
    })
  }

  const { data } = await worker.recognize(imageSource)
  return {
    text: (data.text || '').trim(),
    confidence: data.confidence ?? 0,
  }
}

/** Reset the cached worker (e.g. to free memory). */
export async function terminateOcr() {
  if (workerPromise) {
    const worker = await workerPromise
    await worker.terminate()
    workerPromise = null
  }
}
