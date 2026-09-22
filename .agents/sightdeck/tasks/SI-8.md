---
title: Rename PDP heading to Data en locaties
task: SI-8
created: 2026-09-18T16:34
---

# Rename PDP heading to Data en locaties

## Goal

The PDP sessions section heading should read **Data en locaties** instead of **Fysieke sessies**.

## Why

The current heading is leftover from a physical-only sessions list. The table now mixes dates and locations (online and offline), so the copy should match that.

## Approach

Update locale fallback, Sanity schema defaults, and the live `generalSettings` labels. Resolve the heading from `physicalSessionsHeading` (then deprecated `sessionsHeading`) so CMS can still override.
