# Call to Action Block

## Purpose

Prominent call-to-action block with title, description, and button. Used to encourage specific user actions.

## Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Margin Top | String | No | Top margin (0-64px or custom) |
| Margin Bottom | String | No | Bottom margin (0-64px or custom) |
| Width | String | No | Full width or container |
| Background Color | String | No | Block background color |
| Title | String | Yes | CTA headline |
| Description | Text | No | Supporting text |
| Button Label | String | Yes | Button text |
| Button Link | String | Yes | Button destination URL |
| Button Style | String | No | Primary (Yellow) or Secondary (Gold) |

## When to Use

- Conversion-focused sections
- Highlighting important actions
- Registration prompts
- Newsletter signups
- Event enrollment

## Example Usage

**Registration CTA**:
```
CTA Block
├── Margin: Top 48px, Bottom 48px
├── Width: Container
├── Background: va-lightgray
├── Title: "Schrijf je nu in"
├── Description: "Beperkt aantal plaatsen beschikbaar"
├── Button Label: "Inschrijven"
├── Button Link: /register
└── Button Style: Primary (Yellow)
```

**Newsletter CTA**:
```
CTA Block
├── Margin: Top 32px, Bottom 32px
├── Width: Container
├── Title: "Blijf op de hoogte"
├── Description: "Ontvang updates over nieuwe cursussen en events"
├── Button Label: "Aanmelden"
├── Button Link: /newsletter
└── Button Style: Secondary (Gold)
```

## Design Notes

- Use primary (yellow) for main CTAs
- Use secondary (gold) for less prominent actions
- Keep title concise and action-oriented
- Description should provide value proposition
- Consider background color for visual separation
