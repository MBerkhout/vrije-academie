import { CONTAINER_CLASS } from '@/lib/cms'

export default function PdpLoading() {
  return (
    <div className="pb-16 animate-pulse">
      <div className={CONTAINER_CLASS}>
        <div className="py-4 flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-4 w-16 bg-va-lightgray rounded-none" />
          ))}
        </div>
      </div>

      <div className={`${CONTAINER_CLASS} mt-4`}>
        <div className="w-full aspect-[16/7] bg-va-lightgray rounded-none" />
      </div>

      <div className={CONTAINER_CLASS}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 flex flex-col gap-4">
            <div className="h-8 w-3/4 bg-va-lightgray rounded-none" />
            <div className="h-4 w-full bg-va-lightgray rounded-none" />
            <div className="h-4 w-5/6 bg-va-lightgray rounded-none" />
            <div className="h-4 w-4/6 bg-va-lightgray rounded-none" />
          </div>
          <div className="h-64 bg-va-lightgray rounded-none" />
        </div>
      </div>

      <div className={`${CONTAINER_CLASS} mt-8`}>
        <div className="h-6 w-24 bg-va-lightgray rounded-none mb-4" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 bg-va-lightgray rounded-none mb-3" />
        ))}
      </div>
    </div>
  )
}
