import type { Area } from 'react-easy-crop'

const maximumCroppedImageWidth = 1800
const outputQuality = 0.92

const fileExtensionsByType: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

function loadImage(imageSrc: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('The selected image could not be loaded.'))
    image.src = imageSrc
  })
}

function outputTypeFor(file: File) {
  return file.type in fileExtensionsByType ? file.type : 'image/jpeg'
}

function croppedFileName(file: File, outputType: string) {
  const extension = fileExtensionsByType[outputType] ?? 'jpg'
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'recipe-image'
  return `${baseName}.${extension}`
}

function canvasToBlob(canvas: HTMLCanvasElement, outputType: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
          return
        }

        reject(new Error('The selected image could not be cropped.'))
      },
      outputType,
      outputType === 'image/png' ? undefined : outputQuality,
    )
  })
}

export async function cropImageFile(file: File, imageSrc: string, croppedAreaPixels: Area) {
  const image = await loadImage(imageSrc)
  const cropX = Math.max(0, Math.round(croppedAreaPixels.x))
  const cropY = Math.max(0, Math.round(croppedAreaPixels.y))
  const cropWidth = Math.min(Math.round(croppedAreaPixels.width), image.naturalWidth - cropX)
  const cropHeight = Math.min(Math.round(croppedAreaPixels.height), image.naturalHeight - cropY)

  if (cropWidth <= 0 || cropHeight <= 0) {
    throw new Error('Choose a larger crop area before applying.')
  }

  const outputScale = Math.min(1, maximumCroppedImageWidth / cropWidth)
  const canvas = document.createElement('canvas')

  canvas.width = Math.max(1, Math.round(cropWidth * outputScale))
  canvas.height = Math.max(1, Math.round(cropHeight * outputScale))

  const context = canvas.getContext('2d')
  if (!context) throw new Error('The image crop canvas could not be created.')

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'
  context.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, canvas.width, canvas.height)

  const outputType = outputTypeFor(file)
  const blob = await canvasToBlob(canvas, outputType)
  return new File([blob], croppedFileName(file, outputType), {
    lastModified: Date.now(),
    type: outputType,
  })
}
