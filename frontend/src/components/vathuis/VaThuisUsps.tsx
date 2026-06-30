import { CONTAINER_CLASS } from '@/lib/cms'

interface VaThuisUspsProps {
  items: { title: string; body?: string | null }[]
}

export function VaThuisUsps({ items }: VaThuisUspsProps) {
  if (!items.length) return null

  return (
    <section className={`${CONTAINER_CLASS} py-8 border-y border-va-darkgray-800`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {items.map((item) => (
          <div key={item.title} className="text-center">
            <h2 className="font-sans text-xl font-bold text-white">{item.title}</h2>
            {item.body ? (
              <p className="mt-1 text-sm text-va-gray-300">{item.body}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  )
}
