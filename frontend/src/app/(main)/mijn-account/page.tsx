import { MijnAccountDashboard } from '@/components/account/MijnAccountDashboard'
import { noIndexMetadata } from '@/lib/cms/seo-metadata'

export const metadata = noIndexMetadata('Mijn account – Vrije Academie')

export default function MijnAccountPage() {
  return <MijnAccountDashboard />
}
