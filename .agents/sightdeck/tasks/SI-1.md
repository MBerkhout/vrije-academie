---
title: Align course list prices and times in columns
task: SI-1
created: 2026-09-18T16:26
---

# Align course list prices and times in columns

## Goal

On `/agenda`, time ranges and prices should sit in two fixed-width columns so they line up across rows.

## Why

Each `AgendaRow` is its own CSS grid with `auto` columns for time and price. Rows size independently, so `€ 90,-` and `€ 1.565,-` (and shorter vs longer time strings) do not share a vertical axis.

## Approach

Give the time and price tracks explicit widths from `sm` up, with `tabular-nums`. Right-align prices. Mobile stays stacked (time under the date, price under the title).
