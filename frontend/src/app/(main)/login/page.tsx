import { Suspense } from 'react'
import { cmsClient } from '@/lib/cms/server'
import { Breadcrumbs } from '@/components/common/Breadcrumbs'
import { LoginForm } from '@/components/auth/LoginForm'

export const metadata = {
  title: 'Inloggen – Vrije Academie',
}

export default async function LoginPage() {
  const settings = await cmsClient.getGeneralSettings()
  const account = settings?.account ?? {}

  return (
    <div className="max-w-[1240px] mx-auto px-4 md:px-8 min-[1240px]:px-0 py-8">
      <Breadcrumbs
        crumbs={[
          { label: 'Home', href: '/' },
          { label: account.loginHeading ?? 'Inloggen' },
        ]}
        className="mb-6"
      />
      <Suspense>
        <LoginForm settings={account} />
      </Suspense>
    </div>
  )
}
