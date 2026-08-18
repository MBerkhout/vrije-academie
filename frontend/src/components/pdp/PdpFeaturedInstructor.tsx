import { defaultMessages } from '@/lib/i18n/messages'
import { cn } from '@/lib/utils'
import type { EventInstructor } from '@/lib/commerce/types'

interface PdpFeaturedInstructorProps {
  instructor: EventInstructor
  variant?: 'light' | 'dark'
}

export function PdpFeaturedInstructor({ instructor, variant = 'light' }: PdpFeaturedInstructorProps) {
  const name = instructor.name?.trim()
  const bio = instructor.bio?.trim()
  const role = instructor.role?.trim()
  const photoUrl = instructor.photo_url?.trim()

  if (!name) return null

  const t = defaultMessages.pdp
  const isDark = variant === 'dark'
  const borderClass = isDark ? 'border-va-darkgray-700' : 'border-va-lightgray'
  const headingClass = isDark ? 'text-white' : 'text-va-black'
  const roleClass = isDark ? 'text-va-gray-300' : 'text-va-gray'
  const bioClass = isDark ? 'text-va-gray-200' : 'text-va-darkgray'
  const placeholderClass = isDark ? 'bg-va-darkgray-800 text-va-gray-300' : 'bg-va-lightgray text-va-gray'

  return (
    <section className={cn('border-t pt-4', borderClass)} aria-labelledby="pdp-featured-instructor">
      <h3 id="pdp-featured-instructor" className={cn('text-sm font-semibold mb-3', headingClass)}>
        {t.bookingFeaturedInstructorHeading}
      </h3>
      <div className="flex flex-col gap-3">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- docent photos may come from various hosts
          <img
            src={photoUrl}
            alt=""
            width={120}
            height={120}
            className="h-[120px] w-[120px] rounded object-cover"
          />
        ) : (
          <div
            className={cn(
              'flex h-[120px] w-[120px] items-center justify-center rounded text-2xl font-semibold',
              placeholderClass
            )}
            aria-hidden
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div>
          <p className={cn('font-semibold', headingClass)}>{name}</p>
          {role ? <p className={cn('text-sm mt-0.5', roleClass)}>{role}</p> : null}
          {bio ? <p className={cn('text-sm mt-2 leading-relaxed', bioClass)}>{bio}</p> : null}
        </div>
      </div>
    </section>
  )
}
