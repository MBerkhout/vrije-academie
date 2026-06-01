# Demand Nearby

Postcode search block: title, optional intro (Portable Text), and shared layout. Submitting navigates to the results route with a `postcode` query param.

## Section title (Studio)

**Section Title** and **Title size** live in a collapsible *Section title* fieldset, with the same button-style size control as FAQ / Accordion and Categories blocks. New blocks default to *Bekijk het aanbod bij jou in de buurt*; the frontend shows that line when the title is empty.

## Visual treatment (frontend)

The block uses a **#f3f3f3** section with a subtle map image from the Next app (**`frontend/src/assets/city-map.jpg`**, bundled via static import—not a Studio asset). Content sits in a **rounded yellow** (`va-yellow-200`) card: centered heading, **flush** white input + **charcoal** submit (`va-black-800`).

## Frontend-only strings

Placeholder text, the search button label, and the results path (e.g. `/ons-aanbod`) are **not** Studio fields. They live in the Next app at `frontend/src/content/form-strings.json` → `demandNearby`, so copy and routing stay versioned with the frontend (aligned with form/newsletter strings managed outside the block document).
