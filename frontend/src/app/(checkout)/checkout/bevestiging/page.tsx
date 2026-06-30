import { redirect } from 'next/navigation'

interface BevestigingRedirectProps {
  searchParams: Promise<{ order?: string; session_id?: string }>
}

/** Legacy checkout confirmation URL — forwards to `/bedankt`. */
export default async function BevestigingRedirectPage({ searchParams }: BevestigingRedirectProps) {
  const params = await searchParams
  const qs = new URLSearchParams()
  if (params.order) qs.set('order', params.order)
  if (params.session_id) qs.set('session_id', params.session_id)
  const suffix = qs.toString()
  redirect(suffix ? `/bedankt?${suffix}` : '/bedankt')
}
