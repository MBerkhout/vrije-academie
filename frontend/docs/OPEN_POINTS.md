# Open Points & Future Considerations

## Authentication

**Current**: No authentication required for public site.

**Future**: Member areas may require authentication.

### Architecture Considerations

- **Medusa Customer Auth**: Medusa has built-in customer authentication
- **Sanity Studio Auth**: Sanity Studio has its own authentication (separate from frontend)
- **Frontend Integration**: Frontend will need to handle both:
  - Customer authentication for member areas (Medusa)
  - Admin authentication for content editing (Sanity Studio)

### Implementation Options

1. **Separate Auth Systems**: Keep Medusa and Sanity auth separate
   - Customer login → Medusa
   - Content editor login → Sanity Studio
   - Frontend handles both sessions

2. **Unified Auth**: Use a single auth provider (e.g., Auth0, Clerk)
   - Single sign-on for both systems
   - More complex integration

**Recommendation**: Start with separate auth systems. Unify if needed later.

## Multi-language Support

**Current**: Single language (Dutch).

**Future**: Support multiple languages.

### Implementation Approach

1. **URL Structure**: `/nl/...`, `/en/...`
2. **Translation Files**: Store translations in `src/locales/`
3. **Sanity Integration**: Add `language` field to documents
4. **Medusa Integration**: Support localized product descriptions

### Library Options

- `next-intl` - Popular Next.js i18n library
- `next-i18next` - i18next integration
- Custom solution

**Recommendation**: Use `next-intl` for App Router compatibility.

## Performance Optimization

### Image Optimization

- Use Next.js Image component (already implemented)
- Implement image lazy loading
- Consider WebP format
- CDN for Sanity images

### Code Splitting

- Implement route-based code splitting
- Lazy load block components
- Dynamic imports for heavy components

### Caching Strategy

- ISR (Incremental Static Regeneration) for pages
- Cache API responses
- CDN caching for static assets

## Analytics & Tracking

**Future**: Implement analytics tracking.

### Options

- Google Analytics 4
- Plausible Analytics
- Custom analytics solution

### Tracking Events

- Page views
- Event registrations
- CTA clicks
- Search queries

## Search Functionality

**Future**: Add search for events and content.

### Implementation Options

1. **Client-side Search**: Filter existing data
2. **Server-side Search**: API endpoint with search
3. **Third-party Service**: Algolia, Typesense

**Consideration**: Search across both Sanity content and Medusa events.

## Payment Integration

**Current**: Medusa handles payment processing.

**Future Considerations**:
- Multiple payment providers
- Payment method preferences
- Subscription support (if needed)

## Testing Strategy

**Future**: Implement comprehensive testing.

### Testing Types

- Unit tests (components, utilities)
- Integration tests (API layers)
- E2E tests (critical user flows)
- Visual regression tests

### Tools

- Jest + React Testing Library
- Playwright or Cypress
- Storybook for component testing

## Monitoring & Error Tracking

**Future**: Implement monitoring and error tracking.

### Options

- Sentry for error tracking
- Vercel Analytics
- Custom logging solution

## Content Preview

**Current**: Sanity Presentation tool for visual editing.

**Future Enhancements**:
- Draft preview URLs
- Shareable preview links
- Preview for unpublished content

## API Rate Limiting

**Future**: Implement rate limiting for API endpoints.

### Considerations

- Protect against abuse
- Fair usage policies
- Caching to reduce load

## Accessibility Enhancements

**Current**: Basic accessibility implemented.

**Future Improvements**:
- Screen reader testing
- Keyboard navigation improvements
- Focus management
- ARIA labels refinement
