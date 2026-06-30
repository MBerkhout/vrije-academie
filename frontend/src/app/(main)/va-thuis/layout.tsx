import { VaThuisSubNav } from '@/components/vathuis/VaThuisSubNav'

export default function VaThuisLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-va-black text-white">
      <VaThuisSubNav />
      {children}
    </div>
  )
}
