import type { Block } from '@/lib/cms'
import { BlockRenderer } from '@/components/blocks'

interface PdpBodyProps {
  blocks?: unknown[]
}

/** Renders PDP editorial body by passing blocks through the shared BlockRenderer. */
export function PdpBody({ blocks }: PdpBodyProps) {
  if (!blocks?.length) return null

  return (
    <div className="pdp-body">
      {(blocks as Block[]).map((block, i) => (
        <BlockRenderer key={block._id ?? String(i)} block={block} />
      ))}
    </div>
  )
}
