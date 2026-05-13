import { useMemo, useState } from 'react'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ButtonBase from '@mui/material/ButtonBase'
import IconButton from '@mui/material/IconButton'

export type CarouselImage = {
  alt: string
  url: string
}

export function ImageCarousel({
  ariaLabel = 'Image carousel',
  className = '',
  emptyLabel = 'Image',
  images,
  maxFloatingImages = 5,
}: {
  ariaLabel?: string
  className?: string
  emptyLabel?: string
  images: CarouselImage[]
  maxFloatingImages?: number
}) {
  const visibleImages = useMemo(
    () => images.filter((image) => image.url).slice(0, maxFloatingImages),
    [images, maxFloatingImages],
  )
  const imageSetKey = visibleImages.map((image) => image.url).join('\n')
  const [carouselState, setCarouselState] = useState({ imageIndex: 0, imageSetKey: '' })
  const activeImageIndex =
    carouselState.imageSetKey === imageSetKey && carouselState.imageIndex < visibleImages.length
      ? carouselState.imageIndex
      : 0
  const activeImage = visibleImages[activeImageIndex]

  function showPreviousImage() {
    if (!visibleImages.length) return
    setCarouselState({
      imageIndex: (activeImageIndex - 1 + visibleImages.length) % visibleImages.length,
      imageSetKey,
    })
  }

  function showNextImage() {
    if (!visibleImages.length) return
    setCarouselState({
      imageIndex: (activeImageIndex + 1) % visibleImages.length,
      imageSetKey,
    })
  }

  return (
    <section className={`image-carousel ${className}`.trim()} aria-label={ariaLabel}>
      <div className="image-carousel-frame">
        {activeImage ? (
          <img src={activeImage.url} alt={activeImage.alt} />
        ) : (
          <div className="image-carousel-empty">{emptyLabel}</div>
        )}
      </div>
      {visibleImages.length > 1 && (
        <>
          <IconButton
            aria-label="Show previous image"
            className="image-carousel-arrow previous"
            onClick={showPreviousImage}
          >
            <ChevronLeftIcon />
          </IconButton>
          <IconButton aria-label="Show next image" className="image-carousel-arrow next" onClick={showNextImage}>
            <ChevronRightIcon />
          </IconButton>
        </>
      )}
      {visibleImages.length > 0 && (
        <div className="image-carousel-floating-images" aria-label="Image thumbnails">
          {visibleImages.map((image, index) => (
            <ButtonBase
              aria-label={`Show image ${index + 1}`}
              className={`image-carousel-floating-image ${index === activeImageIndex ? 'active' : ''}`}
              component="button"
              key={`${image.url}-${index}`}
              onClick={() => setCarouselState({ imageIndex: index, imageSetKey })}
              type="button"
            >
              <img src={image.url} alt="" />
            </ButtonBase>
          ))}
        </div>
      )}
    </section>
  )
}
