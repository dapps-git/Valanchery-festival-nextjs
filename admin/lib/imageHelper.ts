/**
 * Client-side high performance image compression to WebP.
 * Resizes max dimension to 1200px and converts to WebP with 82% quality.
 * Typical size reduction: 5MB -> ~120KB.
 */
export async function compressImageToWebP(file: File, maxWidth = 1200, quality = 0.82): Promise<{ blob: Blob; dataUrl: string }> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onerror = () => {
      resolve({ blob: file, dataUrl: '' })
    }
    reader.onload = (e) => {
      const originalDataUrl = (e.target?.result as string) || ''
      const img = new Image()
      img.onerror = () => {
        resolve({ blob: file, dataUrl: originalDataUrl })
      }
      img.onload = () => {
        try {
          let width = img.width
          let height = img.height

          if (width > maxWidth || height > maxWidth) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width)
              width = maxWidth
            } else {
              width = Math.round((width * maxWidth) / height)
              height = maxWidth
            }
          }

          const canvas = document.createElement('canvas')
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          if (!ctx) {
            return resolve({ blob: file, dataUrl: originalDataUrl })
          }

          ctx.drawImage(img, 0, 0, width, height)

          const webpDataUrl = canvas.toDataURL('image/webp', quality)

          canvas.toBlob(
            (blob) => {
              if (blob) {
                resolve({ blob, dataUrl: webpDataUrl })
              } else {
                resolve({ blob: file, dataUrl: originalDataUrl })
              }
            },
            'image/webp',
            quality
          )
        } catch {
          resolve({ blob: file, dataUrl: originalDataUrl })
        }
      }
      img.src = originalDataUrl
    }
    reader.readAsDataURL(file)
  })
}
