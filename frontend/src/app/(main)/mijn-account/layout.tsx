import { MijnAccountShell } from '@/components/account/MijnAccountShell'

export default function MijnAccountLayout({ children }: { children: React.ReactNode }) {
  return <MijnAccountShell>{children}</MijnAccountShell>
}
