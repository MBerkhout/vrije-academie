import Link from 'next/link'
import { PLP_BASE_PATH } from '@/lib/routes'
import { CONTAINER_CLASS } from '@/lib/cms'

export default function PdpNotFound() {
  return (
    <div className={`${CONTAINER_CLASS} py-24 text-center flex flex-col items-center gap-6`}>
      <h1 className="font-serif text-3xl font-bold text-va-black">Activiteit niet gevonden</h1>
      <p className="text-va-gray max-w-md">
        De activiteit die je zoekt bestaat niet (meer) of is verplaatst.
      </p>
      <Link
        href={PLP_BASE_PATH}
        className="inline-flex items-center gap-2 bg-va-yellow text-va-black font-bold px-6 py-3 rounded-none hover:bg-va-yellow/90 transition-colors"
      >
        Bekijk ons aanbod
      </Link>
    </div>
  )
}
