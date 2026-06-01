import { cmsClient } from '@/lib/cms/server'
import { CustomerProvider } from '@/lib/commerce/CustomerProvider'
import { CheckoutShellHeader } from '@/components/checkout/CheckoutShellHeader'
import { CheckoutShellFooter } from '@/components/checkout/CheckoutShellFooter'

export default async function CheckoutGroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await cmsClient.getGeneralSettings()

  return (
    <CustomerProvider>
      <div className="flex min-h-screen flex-col bg-white">
        <CheckoutShellHeader />
        <main className="flex-1">{children}</main>
        <CheckoutShellFooter settings={settings} />
      </div>
    </CustomerProvider>
  )
}
