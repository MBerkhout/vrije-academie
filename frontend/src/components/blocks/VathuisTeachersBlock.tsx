import { getTeachersForFilter } from '@/lib/cms/sanity-refs'
import { VaThuisTeacherGrid } from '@/components/vathuis/VaThuisTeacherGrid'
import type { VathuisTeachersBlock as VathuisTeachersBlockType } from '@/lib/cms'

export async function VathuisTeachersBlock({ block }: { block: VathuisTeachersBlockType }) {
  const teachers = await getTeachersForFilter()

  return (
    <VaThuisTeacherGrid
      title={block.title?.trim() || 'Populaire docenten'}
      intro={block.intro}
      teachers={teachers}
    />
  )
}
