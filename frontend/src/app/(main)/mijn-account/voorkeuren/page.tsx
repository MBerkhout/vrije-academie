import { HubSpotFormEmbed } from '@/components/hubspot/HubSpotFormEmbed'
import { defaultMessages } from '@/lib/i18n/messages'
import { noIndexMetadata } from '@/lib/cms/seo-metadata'

/** HubSpot marketing preferences form (portal 145840897, EU). */
const HUBSPOT_VOORKEUREN_FORM_ID = '9e3ce24c-82ec-4945-b495-3014314f4d90'

export const metadata = noIndexMetadata('Voorkeuren – Vrije Academie')

export default function AccountVoorkeurenPage() {
  const t = defaultMessages.accountPage
  return (
    <>
      <h1 className="font-sans text-2xl font-bold text-va-black mb-6">{t.pagePreferencesTitle}</h1>
      <div className="max-w-2xl">
        <HubSpotFormEmbed formId={HUBSPOT_VOORKEUREN_FORM_ID} />
      </div>
    </>
  )
}
