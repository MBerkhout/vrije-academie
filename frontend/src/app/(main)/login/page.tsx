import { Suspense } from 'react'
import { cmsClient } from '@/lib/cms/server'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { LoginForm } from '@/components/auth/LoginForm'

import { noIndexMetadata } from '@/lib/cms/seo-metadata'

export const metadata = noIndexMetadata('Inloggen – Vrije Academie')

export default async function LoginPage() {
  const settings = await cmsClient.getGeneralSettings()
  const account = settings?.account ?? {}

  return (
    <div className="flex flex-col items-center justify-start px-6 pt-6 pb-[7.5rem] lg:pt-8 lg:pb-[10.5rem]">
      <div className="w-full max-w-sm">
        <Breadcrumbs
          crumbs={[
            { label: 'Home', href: '/' },
            { label: account.loginHeading ?? 'Inloggen' },
          ]}
          className="mb-4"
        />
        <Suspense>
          <LoginForm settings={account} />
        </Suspense>
      </div>
    </div>
  )
}
