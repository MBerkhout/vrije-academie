# Event List Block

## Purpose

Dynamic list of events fetched from Medusa. Displays events based on filters and configuration.

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Margin Top | String | No | Top margin (0-64px or custom) |
| Margin Bottom | String | No | Bottom margin (0-64px or custom) |
| Width | String | No | Full width or container |
| Background Color | String | No | Block background color |
| Section Title | String | No | Heading for the event list |
| Filter by Category | String | No | Filter events by category |
| Filter by Type | String | No | All, Online Only, or Offline Only |
| Limit | Number | No | Maximum number of events (default: 10) |
| Show Past Events | Boolean | No | Include past events (default: false) |

## When to Use

- Event listing pages
- Event archive sections
- Category-specific event pages
- Homepage event highlights

## Example Usage

**Upcoming Events**:
```
Event List Block
├── Margin: Top 32px, Bottom 32px
├── Width: Container
├── Title: "Aankomende Collegereeksen"
├── Category: "Collegereeksen"
├── Type: All
├── Limit: 10
└── Show Past Events: false
```

**Online Events Only**:
```
Event List Block
├── Margin: Top 24px, Bottom 24px
├── Width: Container
├── Title: "Online Events"
├── Type: Online Only
├── Limit: 6
└── Show Past Events: false
```

## Integration

This block requires frontend integration with Medusa API:
- Fetches events from `/store/events` endpoint
- Filters by category and type
- Sorts by start date
- Respects limit and past events settings

## Best Practices

- Use meaningful section titles
- Set appropriate limits (6-12 events recommended)
- Filter by category for focused listings
- Hide past events unless creating archive pages
- Consider pagination for large lists
