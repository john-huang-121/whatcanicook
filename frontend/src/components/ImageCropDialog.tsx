import { useState } from 'react'
import Cropper from 'react-easy-crop'
import type { Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import Dialog from '@mui/material/Dialog'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import Fade from '@mui/material/Fade'
import Slider from '@mui/material/Slider'
import { cropImageFile } from '../utils/cropImage'

type CropPoint = {
  x: number
  y: number
}

const defaultCrop: CropPoint = { x: 0, y: 0 }
const dialogSlots = { transition: Fade }

export function ImageCropDialog({
  aspect,
  imageSrc,
  onApply,
  onCancel,
  open,
  sourceFile,
  title,
}: {
  aspect: number
  imageSrc: string
  onApply: (croppedFile: File) => void
  onCancel: () => void
  open: boolean
  sourceFile: File | null
  title: string
}) {
  const [crop, setCrop] = useState<CropPoint>(defaultCrop)
  const [cropError, setCropError] = useState('')
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [cropping, setCropping] = useState(false)
  const [zoom, setZoom] = useState(1)

  async function applyCrop() {
    if (!sourceFile || !imageSrc || !croppedAreaPixels) {
      setCropError('Choose a crop area before applying.')
      return
    }

    setCropError('')
    setCropping(true)

    try {
      const croppedFile = await cropImageFile(sourceFile, imageSrc, croppedAreaPixels)
      onApply(croppedFile)
    } catch (error) {
      setCropError(error instanceof Error ? error.message : 'The selected image could not be cropped.')
    } finally {
      setCropping(false)
    }
  }

  function updateZoom(value: number | number[]) {
    setZoom(Array.isArray(value) ? value[0] : value)
  }

  return (
    <Dialog
      className="image-crop-dialog"
      fullWidth
      maxWidth="md"
      open={open}
      slots={dialogSlots}
      onClose={() => {
        if (!cropping) onCancel()
      }}
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent className="image-crop-dialog-content">
        <div className="image-cropper-frame">
          {imageSrc && (
            <Cropper
              aspect={aspect}
              crop={crop}
              image={imageSrc}
              restrictPosition
              showGrid={false}
              style={{ mediaStyle: { maxWidth: 'unset' } }}
              zoom={zoom}
              onCropChange={setCrop}
              onCropComplete={(_, nextCroppedAreaPixels) => setCroppedAreaPixels(nextCroppedAreaPixels)}
              onZoomChange={setZoom}
            />
          )}
        </div>
        <label className="image-crop-zoom-control">
          <span>Zoom</span>
          <Slider
            aria-label="Image crop zoom"
            disabled={cropping}
            max={3}
            min={1}
            step={0.01}
            value={zoom}
            onChange={(_, value) => updateZoom(value)}
          />
        </label>
        {cropError && <Alert severity="error">{cropError}</Alert>}
      </DialogContent>
      <DialogActions>
        <Button type="button" variant="text" disabled={cropping} onClick={onCancel}>
          Cancel
        </Button>
        <Button type="button" className="primary-button" variant="contained" disabled={cropping} onClick={applyCrop}>
          {cropping ? 'Cropping...' : 'Apply Crop'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
