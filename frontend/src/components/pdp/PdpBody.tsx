import type { Block } from '@/lib/cms'
import { BlockRenderer } from '@/components/blocks'

interface PdpBodyProps {
  blocks?: unknown[]
  tone?: 'default' | 'onDark'
}

/** Renders PDP editorial body by passing blocks through the shared BlockRenderer. */
export function PdpBody({ blocks, tone = 'default' }: PdpBodyProps) {
  if (!blocks?.length) return null

  return (
    <div className="pdp-body">
      {(blocks as Block[]).map((block, i) => (
        <BlockRenderer key={block._id ?? String(i)} block={block} tone={tone} />
      ))}
    </div>
  )
}
