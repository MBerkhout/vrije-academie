import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { noIndexMetadata } from '@/lib/cms/seo-metadata'
import {
  Badge,
  Button,
  Card,
  Input,
  Spinner,
  Textarea,
} from '@/components/ui'
import {
  vaColorFamilies,
  vaColorShades,
  vaColors,
} from '@/lib/va-colors.js'
import { PlpEventCard } from '@/components/plp/PlpEventCard'
import { PlpEmptyState } from '@/components/plp/PlpEmptyState'
import { ErrorView } from '@/components/ErrorView'

export const metadata: Metadata = noIndexMetadata('Component library – Vrije Academie')

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mb-12">
      <h2 className="text-xl font-sans font-bold text-va-black mb-4">
        {title}
      </h2>
      <div className="space-y-6">{children}</div>
    </section>
  )
}

export default function DevComponentsPage() {
  if (process.env.NODE_ENV === 'production') {
    notFound()
  }

  return (
    <div className="bg-va-lightgray py-12">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-sans font-bold text-va-black mb-8">
          Component Library
        </h1>
        <p className="font-sans text-va-darkgray mb-12">
          Dev-only page. Not available in production.
        </p>

        <Section title="Colors">
          <p className="text-sm text-va-darkgray mb-4">
            Each family has <code className="font-mono text-xs">50–950</code>{' '}
            plus <code className="font-mono text-xs">DEFAULT</code> (same as
            before). Examples:{' '}
            <code className="font-mono text-xs">bg-va-yellow-600</code>,{' '}
            <code className="font-mono text-xs">hover:border-va-gold-400</code>.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <div className="bg-va-yellow text-va-black p-3 rounded-sm text-sm">
              va-yellow (DEFAULT)
            </div>
            <div className="bg-va-gold text-va-black p-3 rounded-sm text-sm">
              va-gold (DEFAULT)
            </div>
            <div className="bg-va-purple text-white p-3 rounded-sm text-sm">
              va-purple (DEFAULT)
            </div>
            <div className="bg-va-orange text-white p-3 rounded-sm text-sm">
              va-orange (DEFAULT)
            </div>
            <div className="bg-va-brown text-white p-3 rounded-sm text-sm">
              va-brown (DEFAULT)
            </div>
            <div className="bg-va-black text-white p-3 rounded-sm text-sm">
              va-black (DEFAULT)
            </div>
            <div className="bg-va-footer text-white p-3 rounded-sm text-sm">
              va-footer (DEFAULT)
            </div>
            <div className="bg-va-darkgray text-white p-3 rounded-sm text-sm">
              va-darkgray (DEFAULT)
            </div>
            <div className="bg-va-gray text-white p-3 rounded-sm text-sm">
              va-gray (DEFAULT)
            </div>
            <div className="bg-va-lightgray text-va-black p-3 rounded-sm text-sm">
              va-lightgray (DEFAULT)
            </div>
            <div className="bg-va-white border border-va-lightgray text-va-black p-3 rounded-sm text-sm">
              va-white (DEFAULT)
            </div>
          </div>
          <h3 className="text-sm font-semibold text-va-black mb-3">
            Full ramps (from <code className="font-mono text-xs">src/lib/va-colors.js</code>)
          </h3>
          <div className="space-y-6">
            {vaColorFamilies.map((family) => {
              const ramp = vaColors[family as keyof typeof vaColors] as Record<
                number,
                string
              >
              return (
              <div key={family}>
                <p className="text-xs font-mono text-va-darkgray mb-1">
                  va-{family}
                </p>
                <div className="flex rounded-sm overflow-hidden border border-va-lightgray">
                  {vaColorShades.map((shade) => (
                    <div
                      key={shade}
                      className="flex-1 min-h-12 min-w-0"
                      style={{
                        backgroundColor: ramp[shade],
                      }}
                      title={`va-${family}-${shade} ${ramp[shade]}`}
                    />
                  ))}
                </div>
                <div className="flex text-[10px] text-va-gray mt-0.5 font-mono">
                  {vaColorShades.map((shade) => (
                    <span key={shade} className="flex-1 text-center truncate">
                      {shade}
                    </span>
                  ))}
                </div>
              </div>
              )
            })}
          </div>
        </Section>

        <Section title="Button">
          <div className="flex flex-wrap gap-4">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="primary" disabled>
              Disabled
            </Button>
          </div>
          <div className="flex flex-wrap gap-4 items-center">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </div>
          <div>
            <Button href="/">As Link</Button>
          </div>
        </Section>

        <Section title="Badge">
          <p className="text-sm text-va-darkgray mb-3">Legacy (uppercase)</p>
          <div className="flex flex-wrap gap-2 mb-6">
            <Badge variant="purple">Virtual – ON DEMAND</Badge>
            <Badge variant="yellow">Nieuw</Badge>
            <Badge variant="gray">Archief</Badge>
          </div>
          <p className="text-sm text-va-darkgray mb-3">Content (PDP / PLP / checkout)</p>
          <div className="flex flex-wrap gap-2 items-center">
            <Badge variant="category" size="sm">Sterrenkunde</Badge>
            <Badge variant="record" size="sm">College</Badge>
            <Badge variant="online" size="sm">Nu ook online te volgen!</Badge>
            <Badge variant="popular">Meest gekozen</Badge>
            <Badge variant="freeTrial" size="md">
              <span className="w-4 h-4 rounded-full bg-va-black/10" aria-hidden />
              Gratis proefles
            </Badge>
          </div>
        </Section>

        <Section title="Card">
          <div className="grid sm:grid-cols-2 gap-4">
            <Card
              title="Card zonder afbeelding"
              description="Een kaart zonder afbeelding voor gebruik in lijsten."
            />
            <Card
              title="Card met link"
              description="Met een link naar meer informatie."
              link="#"
              linkText="Bekijk meer"
            />
          </div>
        </Section>

        <Section title="Input">
          <div className="max-w-sm space-y-4">
            <Input label="Email" type="email" placeholder="naam@voorbeeld.nl" />
            <Input
              label="Met foutmelding"
              placeholder="Verplicht veld"
              error="Verplicht veld"
            />
            <Input placeholder="Zonder label" />
            <Input label="Disabled" disabled placeholder="Uitgeschakeld" />
          </div>
        </Section>

        <Section title="Textarea">
          <div className="max-w-sm">
            <Textarea
              label="Bericht"
              placeholder="Typ je bericht..."
              rows={4}
            />
            <div className="mt-4">
              <Textarea
                label="Met foutmelding"
                error="Dit veld is verplicht"
                rows={3}
              />
            </div>
          </div>
        </Section>

        <Section title="Spinner">
          <div className="flex gap-8 items-center">
            <Spinner size="sm" />
            <Spinner size="md" />
            <Spinner size="lg" />
          </div>
        </Section>

        <Section title="PLP — Event Card">
          <div className="max-w-xs">
            <PlpEventCard
              event={{
                id: 'demo-1',
                handle: 'demo-aquarel',
                title: 'Aquarelcursus voor beginners',
                thumbnail: null,
                record_type: 'collegereeks',
                categories: [{ id: 'c1', slug: 'kunst', label: 'Kunst' }],
                cities: ['Amsterdam'],
                delivery_types: ['offline'],
                earliest_start_at: new Date(Date.now() + 7 * 86400000).toISOString(),
                price_from: 8900,
                min_available_quantity: 3,
                badge: null,
              }}
              stockThreshold={5}
            />
          </div>
          <div className="max-w-xs">
            <PlpEventCard
              event={{
                id: 'demo-2',
                handle: 'demo-online',
                title: 'Filosofie online — Socrates tot nu',
                thumbnail: null,
                record_type: 'lezing',
                categories: [{ id: 'c2', slug: 'filosofie', label: 'Filosofie' }],
                cities: [],
                delivery_types: ['online'],
                earliest_start_at: null,
                price_from: 2500,
                min_available_quantity: 0,
                badge: 'ON DEMAND',
              }}
              stockThreshold={5}
            />
          </div>
          <div className="max-w-xs">
            <PlpEventCard
              event={{
                id: 'demo-3',
                handle: 'demo-hybrid',
                title: 'Filosofie — op locatie én online',
                thumbnail: null,
                record_type: 'collegereeks',
                categories: [{ id: 'c3', slug: 'filosofie', label: 'Filosofie' }],
                cities: ['Utrecht'],
                delivery_types: ['offline', 'online'],
                earliest_start_at: new Date(Date.now() + 14 * 86400000).toISOString(),
                price_from: 4500,
                min_available_quantity: 12,
                badge: null,
              }}
              stockThreshold={5}
            />
          </div>
        </Section>

        <Section title="PLP — Empty State">
          <PlpEmptyState
            heading="Geen activiteiten gevonden."
            subtext="Probeer een andere zoekopdracht of pas je filters aan."
            hasFilters
          />
        </Section>

        <Section title="PLP — Active Chips (static preview)">
          <div className="flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1 bg-va-yellow/20 text-va-black text-xs font-medium px-2.5 py-1 rounded-full border border-va-yellow/40">
              Kunst <button className="ml-0.5 text-va-darkgray text-sm leading-none">×</button>
            </span>
            <span className="inline-flex items-center gap-1 bg-va-yellow/20 text-va-black text-xs font-medium px-2.5 py-1 rounded-full border border-va-yellow/40">
              Amsterdam <button className="ml-0.5 text-va-darkgray text-sm leading-none">×</button>
            </span>
            <button className="text-xs text-va-gray underline hover:text-va-black">
              Wis alle filters
            </button>
          </div>
        </Section>

        <Section title="500 — Server error">
          <p className="text-sm text-va-gray mb-4">
            Preview of <code className="font-mono text-xs">ErrorView</code> (used by{' '}
            <code className="font-mono text-xs">error.tsx</code> /{' '}
            <code className="font-mono text-xs">global-error.tsx</code>).
          </p>
          <div className="bg-white">
            <ErrorView onRetry={() => undefined} digest="abc123" />
          </div>
        </Section>

        <Section title="PDP — Booking Panel (mock)">
          <p className="text-sm text-va-gray mb-4">Static preview of the booking panel with mock data. Interactive variant (cart wiring) requires a live Medusa connection.</p>
          <div className="max-w-sm">
            <div className="rounded-xl border border-va-lightgray bg-white p-5 flex flex-col gap-4">
              <div>
                <span className="text-xs text-va-gray">Vanaf</span>
                <div className="text-2xl font-bold text-va-black">€ 195</div>
              </div>
              <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-va-yellow/20 text-va-black px-3 py-1.5 rounded-full w-fit">
                Gratis proefles
              </span>
              <p className="text-sm text-va-orange font-medium">Nog maar 3 plaatsen beschikbaar</p>
              <button className="w-full bg-va-yellow text-va-black font-bold py-3 px-4 rounded-lg">
                Direct inschrijven
              </button>
              <button className="w-full border border-va-lightgray text-va-black font-medium py-3 px-4 rounded-lg">
                Bewaren
              </button>
            </div>
          </div>
        </Section>
      </div>
    </div>
  )
}
