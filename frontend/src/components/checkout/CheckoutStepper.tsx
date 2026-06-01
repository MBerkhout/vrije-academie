import clsx from 'clsx'
import Link from 'next/link'

export interface StepLabels {
  summary?: string
  login?: string
  payment?: string
  confirmation?: string
}

export interface StepHrefs {
  summary?: string
  login?: string
  payment?: string
  confirmation?: string
}

interface CheckoutStepperProps {
  step: 1 | 2 | 3 | 4
  labels?: StepLabels
  hrefs?: StepHrefs
}

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export function CheckoutStepper({ step, labels, hrefs }: CheckoutStepperProps) {
  const steps = [
    { n: 1 as const, label: labels?.summary ?? 'Overzicht', href: hrefs?.summary },
    { n: 2 as const, label: labels?.login ?? 'Inloggen', href: hrefs?.login },
    { n: 3 as const, label: labels?.payment ?? 'Betaling', href: hrefs?.payment },
    { n: 4 as const, label: labels?.confirmation ?? 'Bevestiging', href: hrefs?.confirmation },
  ]
  const current = steps.find((s) => s.n === step)
  const prevStep = steps.find((s) => s.n === step - 1)

  return (
    <>
      {/* Mobile: dot strip + label + back link */}
      <div className="sm:hidden flex items-center justify-between font-sans text-sm" aria-label="Checkout step">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1">
            {steps.map(({ n }) => (
              <span
                key={n}
                className={clsx(
                  'h-1.5 rounded-full transition-all duration-300',
                  n === step ? 'w-5 bg-va-yellow' : n < step ? 'w-1.5 bg-va-black' : 'w-1.5 bg-va-lightgray-400'
                )}
              />
            ))}
          </div>
          <span className="font-semibold text-va-black">{current?.label}</span>
          <span className="text-va-gray text-xs">({step} / 4)</span>
        </div>
        {prevStep?.href && (
          <Link
            href={prevStep.href}
            className="flex items-center gap-1 text-va-gray hover:text-va-black transition-colors text-xs"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
              <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Terug
          </Link>
        )}
      </div>

      {/* Desktop: circle + label stepper */}
      <div
        className="hidden sm:flex items-center font-sans text-sm"
        aria-label="Checkout steps"
      >
        {steps.map(({ n, label, href }, idx) => {
          const active = n === step
          const completed = n < step
          const upcoming = n > step
          const clickable = completed && !!href

          const inner = (
            <div className="flex items-center gap-2">
              <div
                className={clsx(
                  'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0',
                  active && 'bg-va-yellow text-va-black',
                  completed && 'bg-va-black text-white',
                  upcoming && 'bg-va-lightgray-300 text-va-gray-500'
                )}
              >
                {completed ? <CheckIcon /> : n}
              </div>
              <span
                className={clsx(
                  'whitespace-nowrap',
                  active && 'font-semibold text-va-black',
                  completed && 'font-medium text-va-darkgray',
                  upcoming && 'font-medium text-va-gray'
                )}
              >
                {label}
              </span>
            </div>
          )

          return (
            <div key={n} className="flex items-center">
              <div aria-current={active ? 'step' : undefined}>
                {clickable ? (
                  <Link
                    href={href}
                    className="flex items-center gap-2 group hover:opacity-70 transition-opacity"
                  >
                    {inner}
                  </Link>
                ) : (
                  inner
                )}
              </div>

              {idx < steps.length - 1 && (
                <div
                  className={clsx(
                    'mx-3 h-px w-8',
                    completed ? 'bg-va-black-200' : 'bg-va-lightgray-400'
                  )}
                  aria-hidden
                />
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
