/** Single person category: exactly one per person document. */
export const PERSON_TYPE_OPTIONS = [
  { title: "Docent", value: "docent" },
  { title: "Team", value: "team" },
  { title: "Gastspreker", value: "gastspreker" },
] as const

export type PersonTypeValue = (typeof PERSON_TYPE_OPTIONS)[number]["value"]
