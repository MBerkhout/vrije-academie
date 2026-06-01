'use client'

import { usePathname } from 'next/navigation'
import { CheckoutStepper, type StepLabels } from './CheckoutStepper'

function pathToStep(pathname: string): 1 | 2 | 3 | 4 {
  if (pathname.includes('/checkout/bevestiging')) return 4
  if (pathname.includes('/checkout/betaling')) return 3
  if (pathname.includes('/checkout/inloggen')) return 2
  return 1
}

const STEP_HREFS = {
  summary: '/winkelwagen',
  login: '/checkout/inloggen',
  payment: '/checkout/betaling',
  confirmation: '/checkout/bevestiging',
}

interface CheckoutStepperClientProps {
  labels?: StepLabels
}

export function CheckoutStepperClient({ labels }: CheckoutStepperClientProps) {
  const pathname = usePathname() ?? ''
  const step = pathToStep(pathname)
  return <CheckoutStepper step={step} labels={labels} hrefs={STEP_HREFS} />
}
