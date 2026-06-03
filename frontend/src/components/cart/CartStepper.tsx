import clsx from 'clsx'
import type { StepLabels } from '@/components/checkout/CheckoutStepper'

interface CartStepperProps {
  step: 1 | 2 | 3 | 4
  labels?: StepLabels
}

const CheckIcon = () => (
  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden>
    <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export function CartStepper({ step, labels }: CartStepperProps) {
  const steps = [
    { n: 1, label: labels?.summary ?? 'Overzicht' },
    { n: 2, label: labels?.login ?? 'Inloggen' },
    { n: 3, label: labels?.payment ?? 'Betaling' },
    { n: 4, label: labels?.confirmation ?? 'Bevestiging' },
  ] as const

  return (
    <div className="flex items-center font-sans text-sm" aria-label="Checkout steps">
      {steps.map(({ n, label }, idx) => {
        const active = n === step
        const completed = n < step
        const upcoming = n > step
        return (
          <div key={n} className={clsx('flex items-center', n === 4 && 'hidden sm:flex')}>
            <div className="flex items-center gap-2" aria-current={active ? 'step' : undefined}>
              <div
                className={clsx(
                  'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold shrink-0',
                  active && 'bg-va-yellow text-va-black',
                  completed && 'bg-va-black text-white',
                  upcoming && 'bg-va-lightgray-300 text-va-gray'
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

            {idx < steps.length - 1 && (
              <div
                className={clsx(
                  'mx-2 h-px w-4 sm:mx-3 sm:w-8',
                  idx === 2 && 'max-sm:hidden',
                  completed ? 'bg-va-black-200' : 'bg-va-lightgray-400'
                )}
                aria-hidden
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
