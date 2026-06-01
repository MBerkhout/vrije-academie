import type { GeneralSettings } from '@/lib/cms'
import { HeaderNav } from './HeaderNav'

interface HeaderProps {
  settings: GeneralSettings | null
}

const emptyHeader: GeneralSettings['header'] = {
  sticky: false,
}

export function Header({ settings }: HeaderProps) {
  const header = settings?.header ?? emptyHeader
  return <HeaderNav header={header} />
}
