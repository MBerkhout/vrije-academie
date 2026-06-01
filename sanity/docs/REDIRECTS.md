# Redirects

CMS-managed URL redirects for the Next.js storefront.

## Overview

Editors manage redirects in Studio under **Redirects**. When a **Page** is deleted, Studio prompts for an optional redirect target before removal. The live site enforces redirects via Next.js middleware.

## Redirect document

| Field | Description |
| --- | --- |
| **From path** (`source`) | Incoming storefront path, must start with `/` (e.g. `/old-page`). |
| **Destination type** | `Page` (reference) or `URL or path` (free text). |
| **Destination page** | Reference to a Page; destination resolves to that page’s slug. |
| **Destination URL or path** | Internal path (e.g. `/new-page`) or external URL. |
| **Permanent redirect (301)** | On by default. Off = temporary redirect (302). |
| **Enabled** | Off = rule is ignored on the live site. |

## Manual redirects

1. Open **Redirects** in the Studio sidebar.
2. Create a new redirect.
3. Set **From path** and choose a destination (page reference or URL/path).
4. Publish the redirect.

Rules are cached on the frontend for about 60 seconds.

## Delete page with redirect

When deleting a **Page**:

1. Studio shows a dialog with the page’s current path.
2. Enter a redirect target and choose **Create redirect & delete**, or choose **Delete without redirect** to skip.
3. The delete prompt always creates a URL/path destination (301, enabled). Edit the redirect afterward if you want a page reference instead.

## Frontend

- Query + cache: `frontend/src/lib/redirects.ts`
- Enforcement: `frontend/src/middleware.ts`

Middleware matches normalized paths (trailing slashes ignored except for `/`) and skips `/_next`, `/api`, `/studio`, and static assets.

## Notes

- Redirects apply to storefront paths only; they do not change Presentation tool locations.
- Changing a Page slug does not auto-create a redirect — add one manually or recreate it when deleting the old page.
