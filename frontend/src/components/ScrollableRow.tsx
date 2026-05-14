import { Fragment, useRef, type Key, type ReactNode } from 'react'

export type ScrollableRowProps<TItem> = {
  ariaLabel?: string
  className?: string
  emptyState?: ReactNode
  getKey: (item: TItem, index: number) => Key
  items: TItem[]
  renderItem: (item: TItem, index: number) => ReactNode
  title: string
}

function renderEmptyState(emptyState: ReactNode) {
  if (emptyState === null || emptyState === undefined) {
    return <p className="empty-state">No items available.</p>
  }

  if (typeof emptyState === 'number' || typeof emptyState === 'string') {
    return <p className="empty-state">{emptyState}</p>
  }

  return emptyState
}

export function ScrollableRow<TItem>({
  ariaLabel,
  className = '',
  emptyState,
  getKey,
  items,
  renderItem,
  title,
}: ScrollableRowProps<TItem>) {
  const scrollerRef = useRef<HTMLDivElement | null>(null)
  const rowClassName = ['scrollable-row', className].filter(Boolean).join(' ')

  const scrollItems = (direction: 1 | -1) => {
    if (!scrollerRef.current) return
    const viewportWidth = scrollerRef.current.clientWidth
    scrollerRef.current.scrollBy({ left: direction * Math.max(320, viewportWidth * 0.9), behavior: 'smooth' })
  }

  return (
    <section className={rowClassName} aria-label={ariaLabel ?? title}>
      <div className="scrollable-row-header">
        <h2>{title}</h2>
        {items.length > 0 && (
          <div className="scrollable-row-actions" aria-label={`${title} controls`}>
            <button type="button" onClick={() => scrollItems(-1)} aria-label={`Scroll ${title} left`}>
              &lsaquo;
            </button>
            <button type="button" onClick={() => scrollItems(1)} aria-label={`Scroll ${title} right`}>
              &rsaquo;
            </button>
          </div>
        )}
      </div>
      {items.length > 0 ? (
        <div className="scrollable-row-scroller" ref={scrollerRef}>
          {items.map((item, index) => (
            <Fragment key={getKey(item, index)}>{renderItem(item, index)}</Fragment>
          ))}
        </div>
      ) : (
        renderEmptyState(emptyState)
      )}
    </section>
  )
}
