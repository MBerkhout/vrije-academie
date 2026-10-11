import { getTeachersForFilter, type TeacherOption } from '@/lib/cms/sanity-refs'
import { VaThuisTeacherGrid } from '@/components/vathuis/VaThuisTeacherGrid'
import type { VathuisTeachersBlock as VathuisTeachersBlockType } from '@/lib/cms'

export async function VathuisTeachersBlock({ block }: { block: VathuisTeachersBlockType }) {
  const picked = (block.docenten ?? []).filter(
    (d): d is TeacherOption => !!d?.slug?.trim() && !!d?.name?.trim(),
  )
  const teachers =
    picked.length > 0 ? picked : await getTeachersForFilter()

  return (
    <VaThuisTeacherGrid
      title={block.title?.trim() || 'Populaire docenten'}
      intro={block.intro}
      teachers={teachers}
      limit={picked.length > 0 ? picked.length : 12}
    />
  )
}
