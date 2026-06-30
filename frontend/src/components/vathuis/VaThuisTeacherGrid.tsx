import Image from 'next/image'
import Link from 'next/link'
import { CONTAINER_CLASS } from '@/lib/cms'
import type { TeacherOption } from '@/lib/cms/sanity-refs'
import { vathuisTeacherHref } from '@/lib/routes'

interface VaThuisTeacherGridProps {
  title: string
  intro?: string | null
  teachers: TeacherOption[]
}

export function VaThuisTeacherGrid({ title, intro, teachers }: VaThuisTeacherGridProps) {
  if (!teachers.length) return null

  const featured = teachers.slice(0, 12)

  return (
    <section className={`${CONTAINER_CLASS} py-12`}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <h2 className="font-sans text-2xl font-bold text-white">{title}</h2>
          {intro ? (
            <p className="mt-3 text-sm text-va-gray-300">{intro}</p>
          ) : null}
        </div>
        <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-3 gap-3">
          {featured.map((teacher) => (
            <Link
              key={teacher.slug}
              href={vathuisTeacherHref(teacher.slug)}
              className="flex items-center gap-3 rounded-lg bg-va-darkgray-900 border border-va-darkgray-700 px-3 py-2 hover:border-va-yellow/50 transition-colors"
            >
              <div className="relative h-10 w-10 shrink-0 rounded-full overflow-hidden bg-va-darkgray-800">
                {teacher.photoUrl ? (
                  <Image
                    src={teacher.photoUrl}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs text-va-gray-500">
                    {teacher.name.charAt(0)}
                  </span>
                )}
              </div>
              <span className="text-sm font-medium text-white line-clamp-2">{teacher.name}</span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
