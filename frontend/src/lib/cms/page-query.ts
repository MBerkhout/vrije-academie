/**
 * GROQ projection for page with all block types.
 * Keep in sync with Sanity block schemas.
 *
 * Blocks are inline objects on `page.blocks[]` (type "object", not separate documents).
 * Types that hold references in nested arrays (categories, persons, columns[].person) must repeat those joins here or refs stay raw.
 * Page-only blocks (e.g. editorialCardsBlock): projected in PAGE_QUERY inline branches; not all types appear in tab panel arrays.
 */

import { SEO_FRAGMENT } from './seo-fragment'

/** Layout flattening for blocks stored inline on `page.blocks`. */
const INLINE_PAGE_BLOCK_LAYOUT = `"_id": coalesce(@._id, @._key),
        "contentWidth": @.width,
        "marginTop": coalesce(@.layout.marginTop, "0"),
        "marginTopCustom": @.layout.marginTopCustom,
        "marginBottom": coalesce(@.layout.marginBottom, "0"),
        "marginBottomCustom": @.layout.marginBottomCustom,
        "paddingTop": coalesce(@.layout.paddingTop, "0"),
        "paddingTopCustom": @.layout.paddingTopCustom,
        "paddingBottom": coalesce(@.layout.paddingBottom, "0"),
        "paddingBottomCustom": @.layout.paddingBottomCustom,
        "width": coalesce(@.layout.width, "container"),
        "backgroundColor": coalesce(@.layout.backgroundColor, "none"),
        "htmlAnchor": @.layout.htmlAnchor`

const PT_BLOCK = `{ _type, _key, children[] { _key, _type, text, marks }, markDefs[] { _key, _type, href, buttonType, label, url }, listItem, style }`

/** Person fields returned for cards / persons block (keep in sync with Person type). */
const PERSON_PUBLIC_FIELDS = `_id, name, photo { asset-> }, role, bio, profileUrl, personType`

/**
 * Filter for dynamic persons list. `^` = enclosing personsBlock (must be valid in this projection scope).
 * Empty typeTags / subjectTags = no filter on that axis.
 */
const PERSONS_DYNAMIC_FILTER = `_type == "person" && defined(name) &&
        (count(array::unique(coalesce(^.dynamicFilters.typeTags, []))) == 0 || personType in array::unique(coalesce(^.dynamicFilters.typeTags, []))) &&
        (count(coalesce(^.dynamicFilters.subjectTags, [])) == 0 || count(coalesce(subjectTags, [])[@ in coalesce(^.dynamicFilters.subjectTags, [])]) > 0) &&
        !(_id in coalesce(^.dynamicFilters.exclude[]._ref, []))`

/** GROQ range endpoints must be integer literals; cap matches schema max. Trim with dynamicFilters.maxItems in PersonsBlock when set. */
const PERSONS_DYNAMIC_SLICE = '[0..199]'

/** Inline personsBlock on page.blocks[]: conditions use @. ; ^ still refers to the block object. */
const PERSONS_BLOCK_RESOLVED_PERSONS_INLINE = `"persons": select(
        @.dataSource == "dynamic" && coalesce(@.dynamicFilters.sort, "alphabetical") == "recently_added" => *[ ${PERSONS_DYNAMIC_FILTER} ] | order(_updatedAt desc) ${PERSONS_DYNAMIC_SLICE} { ${PERSON_PUBLIC_FIELDS} },
        @.dataSource == "dynamic" => *[ ${PERSONS_DYNAMIC_FILTER} ] | order(name asc) ${PERSONS_DYNAMIC_SLICE} { ${PERSON_PUBLIC_FIELDS} },
        @.persons[]-> { ${PERSON_PUBLIC_FIELDS} }
      )`

/** Each column in columnsBlock: expand person->, product refs, images. */
const COLUMNS_BLOCK_COLUMN_FIELDS = `
          columnType,
          width,
          verticalAlignment,
          textTitle,
          textTitleSize,
          textContent[] ${PT_BLOCK},
          mediaType,
          mediaImage { asset-> },
          mediaImageAlt,
          mediaYoutubeUrl,
          mediaMobileImage,
          mediaMobileImageAsset { asset-> },
          mediaCaption,
          mediaAspectRatio,
          highlightImage { asset-> },
          highlightTitle,
          highlightTitleSize,
          highlightTeaser[] ${PT_BLOCK},
          highlightLabel,
          productCardsTitle,
          productCardsItemCtaLabel,
          productCardsManualItems[]-> { _id, title, handle, thumbnailUrl, badge, ctaColor, ctaColorHover, recordType },
          productCardsFooterCtaEnabled,
          productCardsFooterCtaLabel,
          productCardsFooterCtaUrl,
          ctaCardBgImage { asset-> },
          ctaCardTitle,
          ctaCardTitleSize,
          ctaCardOverlay,
          ctaCardBody[] ${PT_BLOCK},
          ctaCardCtaEnabled,
          ctaCardCtaLabel,
          ctaCardCtaUrl,
          person-> { ${PERSON_PUBLIC_FIELDS} },
          personShowBio,
          personShowLink`

const INLINE_COLUMNS_BLOCK_COLUMNS = `"columns": @.columns[] {${COLUMNS_BLOCK_COLUMN_FIELDS}
        }`

/** Shared inner for tab `blocks[]` and in-page nav `inPageNavContent[]` (inline object blocks). */
const TAB_PANEL_NESTED_BLOCKS_INNER = `            ...select(
              @._type == "categoriesBlock" => {
                ...@,
                ${INLINE_PAGE_BLOCK_LAYOUT},
                "items": @.items[] {
                  source,
                  "category": category-> { _id, slug, label, title, image { asset-> }, linkUrl },
                  label,
                  "image": image { asset-> },
                  url
                }
              },
              @._type == "uspBlock" => {
                ...@,
                ${INLINE_PAGE_BLOCK_LAYOUT},
                "items": @.items[] {
                  title,
                  description[] ${PT_BLOCK},
                  linkEnabled,
                  linkLabel,
                  linkUrl
                }
              },
              @._type == "personsBlock" => {
                ...@,
                ${INLINE_PAGE_BLOCK_LAYOUT},
                ${PERSONS_BLOCK_RESOLVED_PERSONS_INLINE}
              },
              @._type == "columnsBlock" => {
                ...@,
                ${INLINE_PAGE_BLOCK_LAYOUT},
                ${INLINE_COLUMNS_BLOCK_COLUMNS}
              },
              {
                ...@,
                ${INLINE_PAGE_BLOCK_LAYOUT}
              }
            )`

const TAB_PANEL_BLOCKS_ARRAY = `blocks[] { ${TAB_PANEL_NESTED_BLOCKS_INNER} }`

export const PAGE_QUERY = `*[_type == "page" && slug.current == $slug][0] {
  _id,
  title,
  "slug": slug.current,
  isVaThuis,
  "blocks": blocks[] {
    ...select(
      @._type == "categoriesBlock" => {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT},
        "items": @.items[] {
          source,
          "category": category-> { _id, slug, label, title, image { asset-> }, linkUrl },
          label,
          "image": image { asset-> },
          url
        }
      },
      @._type == "uspBlock" => {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT},
        "items": @.items[] {
          title,
          description[] ${PT_BLOCK},
          linkEnabled,
          linkLabel,
          linkUrl
        }
      },
      @._type == "personsBlock" => {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT},
        ${PERSONS_BLOCK_RESOLVED_PERSONS_INLINE}
      },
      @._type == "columnsBlock" => {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT},
        ${INLINE_COLUMNS_BLOCK_COLUMNS}
      },
      @._type == "productRowBlock" => {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT},
        "products": products[]-> { _id, handle, title }
      },
      @._type == "editorialCardsBlock" => {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT},
        "backgroundImage": @.backgroundImage { asset->, alt },
        "cards": @.cards[] {
          label,
          title,
          description[] ${PT_BLOCK},
          image { asset->, alt },
          linkLabel,
          linkUrl
        }
      },
      @._type == "heroBlock" => {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT},
        "slides": @.slides[] {
          "backgroundImage": backgroundImage { asset-> },
          overlayOpacity,
          showLogo,
          title,
          titleSize,
          subtitle,
          url,
          contentAlignment
        },
        "topPanelBody": @.topPanelBody[] ${PT_BLOCK},
        "topPanelImage": @.topPanelImage { asset->, alt }
      },
      @._type == "formBlock" => {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT},
        "introText": @.introText[] ${PT_BLOCK},
        "form": form->
      },
      @._type == "tabsBlock" => {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT},
        interactionMode,
        inPageNavItems[] {
          label,
          url,
          htmlAnchor
        },
        "inPageNavContent": @.inPageNavContent[] {
          ${TAB_PANEL_NESTED_BLOCKS_INNER}
        },
        "tabs": @.tabs[] {
          label,
          ${TAB_PANEL_BLOCKS_ARRAY}
        }
      },
      @._type == "giftCardBlock" => {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT},
        "intro": @.intro[] ${PT_BLOCK}
      },
      @._type == "vathuisHeroBlock" => {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT},
        "image": @.image { asset-> { url } }
      },
      @._type == "vathuisCategoriesBlock" => {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT},
        "items": @.items[] {
          "category": category-> { _id, slug, label, title, image { asset-> }, linkUrl }
        }
      },
      @._type == "vathuisProductRowBlock" => {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT},
        "products": products[]-> { _id, handle, title }
      },
      @._type == "vathuisTeachersBlock" => {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT}
      },
      @._type == "vathuisPromoTilesBlock" => {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT},
        "tiles": @.tiles[] {
          title,
          description,
          href,
          image { asset-> { url } }
        }
      },
      {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT}
      }
    )
  },
  seo ${SEO_FRAGMENT}
}`
