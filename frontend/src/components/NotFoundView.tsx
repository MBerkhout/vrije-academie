import { CONTAINER_CLASS } from '@/lib/cms'
import { Button } from '@/components/ui'

export function NotFoundView() {
  return (
    <section className="py-12 md:py-16 border-b border-va-lightgray/80">
      <div className={CONTAINER_CLASS}>
        <h1 className="font-sans text-3xl md:text-4xl font-bold text-va-black leading-tight mb-4">
          404: Deze pagina kan niet gevonden worden
        </h1>
        <p className="font-sans text-sm text-va-darkgray leading-relaxed max-w-2xl mb-10">
          De pagina die je zoekt kan niet worden gevonden, waarschijnlijk bestaat
          deze niet meer. Onze excuses voor het ongemak.
        </p>
        <div className="flex flex-col sm:flex-row flex-wrap gap-3">
          <Button variant="primary" href="/" size="md">
            Naar de homepage
          </Button>
          <Button variant="outline" href="/vragen" size="md">
            Naar vragen
          </Button>
        </div>
      </div>
    </section>
  )
}
