# Open Points & Future Considerations

## Sanity Event Type (Phase 2)

**Current Approach**: Events are managed entirely in Medusa as products.

**Phase 2 Enhancement**: Create a dedicated `event` document type in Sanity that references Medusa product IDs.

### Architecture

- **Medusa**: Handles commerce (pricing, inventory, checkout, cart)
- **Sanity**: Handles rich content (images, long descriptions, related content, SEO)

### Implementation Plan

1. Create `event` document type in Sanity with:
   - `medusaProductId` field (reference to Medusa product)
   - Rich content fields (images, description, related content)
   - SEO fields
   - Category and tagging

2. Frontend integration:
   - Fetch event content from Sanity
   - Fetch commerce data from Medusa
   - Merge data for display

3. Benefits:
   - Rich content editing in Sanity
   - Better SEO with structured content
   - Content reuse and relationships
   - Visual editing for event pages

**Status**: Planned for Phase 2

## Block System Enhancements

### Custom Block Templates

**Question**: Should we support block templates/presets?

**Use Case**: Common block configurations (e.g., "Standard Hero", "Event CTA") that can be saved and reused.

**Consideration**: Sanity supports document templates, but blocks are documents. Could create template documents.

### Block Variants

**Question**: Should blocks support variants (e.g., "Hero - Centered", "Hero - Left Aligned")?

**Current**: Each block type is a single variant.

**Consideration**: Add variant field to blocks, or create separate block types for variants.

## Multi-language Support

**Future**: Support multiple languages for content.

### Approach Options

1. **Document-level language**: Each document has a `language` field, duplicate documents per language
2. **Field-level translations**: Use Sanity's internationalization plugin
3. **Separate datasets**: One dataset per language

### Recommendation

Start with document-level language field. Migrate to field-level translations if needed.

## Content Relationships

**Future**: Better content relationships and cross-referencing.

**Considerations**:
- Related events
- Related courses
- Author/instructor references
- Category hierarchies

## Block Performance

**Question**: How to handle large numbers of blocks on a single page?

**Considerations**:
- Lazy loading blocks
- Pagination for block arrays
- Performance monitoring

## Visual Editing Enhancements

**Future**: Enhanced visual editing capabilities.

**Considerations**:
- Drag-and-drop block reordering
- Inline editing improvements
- Better preview accuracy
- Mobile preview

## Content Migration

**Future**: Tools for migrating content from old system.

**Considerations**:
- Import scripts
- Content mapping
- Validation tools
