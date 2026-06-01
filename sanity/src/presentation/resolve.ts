import { defineLocations, type PresentationPluginOptions } from 'sanity/presentation'

import { PLP_BASE_PATH } from '../constants/storefront-paths'

export const resolve: PresentationPluginOptions['resolve'] = {
  locations: {
    category: defineLocations({
      select: {
        label: 'label',
        slug: 'slug',
      },
      resolve: (doc) => ({
        locations: [
          {
            title: doc?.label ? `Ons aanbod in ${doc.label}` : 'Category',
            href: doc?.slug ? `${PLP_BASE_PATH}/${doc.slug}` : PLP_BASE_PATH,
          },
        ],
      }),
    }),
    page: defineLocations({
      select: {
        title: 'title',
        slug: 'slug.current',
      },
      resolve: (doc) => ({
        locations: [
          {
            title: doc?.title || 'Untitled',
            href: doc?.slug ? `/${doc.slug}` : '/',
          },
        ],
      }),
    }),
    generalSettings: defineLocations({
      select: {},
      resolve: () => ({
        locations: [
          {
            title: 'Home',
            href: '/',
          },
        ],
      }),
    }),
  },
}
