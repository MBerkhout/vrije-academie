import { defaultMessages } from '@/lib/i18n/messages'
import { cn } from '@/lib/utils'
import type { EventInstructor } from '@/lib/commerce/types'

interface PdpFeaturedInstructorProps {
  instructor: EventInstructor
  variant?: 'light' | 'dark'
}

function isRenderablePhoto(url: string | null | undefined): url is string {
  return Boolean(url && /^https?:\/\//i.test(url))
}

/** Highlighted teacher in the booking panel: photo, name, title, and bio. */
export function PdpFeaturedInstructor({ instructor, variant = 'light' }: PdpFeaturedInstructorProps) {
  const name = instructor.name?.trim()
  const role = instructor.role?.trim()
  const photoUrl = instructor.photo_url?.trim()
  const bio = instructor.bio?.trim()

  if (!name) return null

  const t = defaultMessages.pdp
  const isDark = variant === 'dark'
  const borderClass = isDark ? 'border-va-darkgray-700' : 'border-va-lightgray'
  const headingClass = isDark ? 'text-white' : 'text-va-black'
  const nameClass = isDark ? 'text-white' : 'text-va-black'
  const roleClass = isDark ? 'text-va-gray-300' : 'text-va-gray'
  const bioClass = isDark ? 'text-va-gray-300' : 'text-va-darkgray'
  const placeholderClass = isDark ? 'bg-va-darkgray-800 text-va-gray-300' : 'bg-va-lightgray text-va-gray'

  return (
    <section className={cn('border-t pt-4', borderClass)} aria-labelledby="pdp-featured-instructor">
      <h3 id="pdp-featured-instructor" className={cn('text-sm font-semibold mb-3', headingClass)}>
        {t.bookingFeaturedInstructorHeading}
      </h3>
      <div className="flex items-center gap-3">
        {isRenderablePhoto(photoUrl) ? (
          // eslint-disable-next-line @next/next/no-img-element -- docent photos may come from various hosts
          <img
            src={photoUrl}
            alt=""
            width={80}
            height={80}
            className="h-20 w-20 shrink-0 rounded object-cover"
          />
        ) : (
          <div
            className={cn(
              'flex h-20 w-20 shrink-0 items-center justify-center rounded text-xl font-semibold',
              placeholderClass
            )}
            aria-hidden
          >
            {name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0">
          <p className={cn('font-semibold leading-snug', nameClass)}>{name}</p>
          {role ? <p className={cn('text-sm mt-0.5', roleClass)}>{role}</p> : null}
        </div>
      </div>
      {bio ? (
        <p className={cn('mt-3 text-sm leading-relaxed whitespace-pre-wrap', bioClass)}>{bio}</p>
      ) : null}
    </section>
  )
}
