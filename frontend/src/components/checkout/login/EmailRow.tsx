'use client'

interface EmailRowProps {
  email: string
  /** When omitted (e.g. logged-in checkout), the e-mail is shown without an edit control. */
  onEdit?: () => void
}

export function EmailRow({ email, onEdit }: EmailRowProps) {
  return (
    <div className="flex items-center gap-2">
      <p className="font-sans text-sm text-va-darkgray">{email}</p>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          aria-label="E-mailadres wijzigen"
          className="text-va-gray hover:text-va-black transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden>
            <path
              d="M9.5 2.5l2 2L4 12H2v-2L9.5 2.5z"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
