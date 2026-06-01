import type { AgendaItem } from '@/lib/commerce/types'
import { AgendaRow } from './AgendaRow'

interface AgendaResultsListProps {
  items: AgendaItem[]
}

export function AgendaResultsList({ items }: AgendaResultsListProps) {
  return (
    <div className="flex flex-col gap-2">
      {items.map((item) => (
        <AgendaRow key={`${item.id}-${item.variant_id}`} item={item} />
      ))}
    </div>
  )
}
