import { defineType, defineField } from "sanity"
import { defineImageField } from "../objects/imageField"
import { createButtonSelectInput } from "../../components/ButtonSelectInput"
import { PERSON_TYPE_OPTIONS } from "../../lib/personTypeOptions"

const SUBJECT_TAGS = ["filosofie", "architectuur", "kunst", "design", "literatuur", "muziek"] as const
const SUBJECT_TAG_OPTIONS = SUBJECT_TAGS.map((t) => ({ title: t, value: t }))

export const person = defineType({
  name: "person",
  title: "Person",
  type: "document",
  fields: [
    defineImageField({
      name: "photo",
      title: "Photo",
      spec: "personPhoto",
      options: { hotspot: true },
    }),
    defineField({
      name: "name",
      title: "Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "role",
      title: "Role",
      type: "string",
    }),
    defineField({
      name: "personType",
      title: "Type",
      type: "string",
      options: { list: [...PERSON_TYPE_OPTIONS] },
      components: { input: createButtonSelectInput([...PERSON_TYPE_OPTIONS]) },
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "subjectTags",
      title: "Subject",
      type: "array",
      of: [
        {
          type: "string",
          options: { list: SUBJECT_TAG_OPTIONS },
          components: { input: createButtonSelectInput(SUBJECT_TAG_OPTIONS) },
        },
      ],
    }),
    defineField({
      name: "bio",
      title: "Bio",
      type: "text",
      validation: (Rule) => Rule.max(200),
    }),
    defineField({
      name: "profileUrl",
      title: "Profile URL",
      type: "url",
    }),
  ],
  preview: {
    select: { name: "name", role: "role", personType: "personType" },
    prepare({ name, role, personType }) {
      const typeLabel = PERSON_TYPE_OPTIONS.find((o) => o.value === personType)?.title
      const subtitle = [typeLabel, role].filter(Boolean).join(" · ")
      return { title: name || "Person", subtitle: subtitle || undefined }
    },
  },
})
