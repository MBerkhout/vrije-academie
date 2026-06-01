/**
 * Form submit handler. Sanity form-toolkit forms POST here.
 * TODO(HUBSPOT): Add HubSpot submission mapping when final integration is approved.
 */
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const formId = formData.get('_formId')?.toString()

    // Stub: always return success for now
    return NextResponse.json({
      success: true,
      message: formId ? `Form ${formId} received.` : 'Form submitted successfully.',
    })
  } catch {
    return NextResponse.json(
      { success: false, message: 'Er is iets misgegaan. Probeer het opnieuw.' },
      { status: 500 }
    )
  }
}
