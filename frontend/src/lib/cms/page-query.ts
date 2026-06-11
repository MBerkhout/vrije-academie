/**
 * GROQ projection for page with all block types.
 * Keep in sync with Sanity block schemas.
 *
 * Inline blocks: when `page.blocks[]` items are full documents (no `_ref`), the default branch only spreads `@`.
 * Types that hold references in nested arrays (categories, USP, persons, columns[].person) must repeat those joins here or refs stay raw.
 * Page-only blocks (e.g. editorialCardsBlock): projected in `BLOCK_PROJECTION` + PAGE_QUERY inline branch; not in tab panel arrays.
 */

const LAYOUT_FIELDS = `"marginTop": coalesce(layout.marginTop, "0"),
        "marginTopCustom": layout.marginTopCustom,
        "marginBottom": coalesce(layout.marginBottom, "0"),
        "marginBottomCustom": layout.marginBottomCustom,
        "paddingTop": coalesce(layout.paddingTop, "0"),
        "paddingTopCustom": layout.paddingTopCustom,
        "paddingBottom": coalesce(layout.paddingBottom, "0"),
        "paddingBottomCustom": layout.paddingBottomCustom,
        "width": coalesce(layout.width, "container"),
        "backgroundColor": coalesce(layout.backgroundColor, "none"),
        "htmlAnchor": layout.htmlAnchor`

/** Layout flattening for blocks stored inline on `page.blocks` (no array item `_ref`). Same keys as the default inline branch. */
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
const PERSONS_DYNAMIC_FILTER = `_type == "person" &&
        (count(coalesce(^.dynamicFilters.typeTags, [])) == 0 || personType in coalesce(^.dynamicFilters.typeTags, [])) &&
        (count(coalesce(^.dynamicFilters.subjectTags, [])) == 0 || count(coalesce(subjectTags, [])[@ in coalesce(^.dynamicFilters.subjectTags, [])]) > 0) &&
        !(_id in coalesce(^.dynamicFilters.exclude[]._ref, []))`

/** GROQ range endpoints must be integer literals; cap 12 matches schema max. Trim with dynamicFilters.maxItems in PersonsBlock. */
const PERSONS_DYNAMIC_SLICE = "[0..11]"

const PERSONS_BLOCK_RESOLVED_PERSONS = `"persons": select(
        dataSource == "dynamic" && coalesce(dynamicFilters.sort, "alphabetical") == "recently_added" => *[ ${PERSONS_DYNAMIC_FILTER} ] | order(_updatedAt desc) ${PERSONS_DYNAMIC_SLICE} { ${PERSON_PUBLIC_FIELDS} },
        dataSource == "dynamic" => *[ ${PERSONS_DYNAMIC_FILTER} ] | order(name asc) ${PERSONS_DYNAMIC_SLICE} { ${PERSON_PUBLIC_FIELDS} },
        persons[]-> { ${PERSON_PUBLIC_FIELDS} }
      )`

/** Inline personsBlock on page.blocks[]: conditions use @. ; ^ still refers to the block object. */
const PERSONS_BLOCK_RESOLVED_PERSONS_INLINE = `"persons": select(
        @.dataSource == "dynamic" && coalesce(@.dynamicFilters.sort, "alphabetical") == "recently_added" => *[ ${PERSONS_DYNAMIC_FILTER} ] | order(_updatedAt desc) ${PERSONS_DYNAMIC_SLICE} { ${PERSON_PUBLIC_FIELDS} },
        @.dataSource == "dynamic" => *[ ${PERSONS_DYNAMIC_FILTER} ] | order(name asc) ${PERSONS_DYNAMIC_SLICE} { ${PERSON_PUBLIC_FIELDS} },
        @.persons[]-> { ${PERSON_PUBLIC_FIELDS} }
      )`

/** Each column in columnsBlock: expand person->, product refs, images (inline + referenced blocks). */
const COLUMNS_BLOCK_COLUMN_FIELDS = `
          columnType,
          width,
          verticalAlignment,
          textTitle,
          textTitleSize,
          textContent[] { _type, _key, children, markDefs, listItem, style },
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
          highlightTeaser[] { _type, _key, children, markDefs, listItem, style },
          highlightLabel,
          productCardsTitle,
          productCardsItemCtaLabel,
          productCardsManualItems[]-> { _id, title, handle, thumbnailUrl, badge, recordType },
          productCardsFooterCtaEnabled,
          productCardsFooterCtaLabel,
          productCardsFooterCtaUrl,
          ctaCardBgImage { asset-> },
          ctaCardTitle,
          ctaCardTitleSize,
          ctaCardOverlay,
          ctaCardBody[] { _type, _key, children, markDefs, listItem, style },
          ctaCardCtaEnabled,
          ctaCardCtaLabel,
          ctaCardCtaUrl,
          person-> { ${PERSON_PUBLIC_FIELDS} },
          personShowBio,
          personShowLink`

const COLUMNS_BLOCK_COLUMNS_ARRAY = `columns[] {${COLUMNS_BLOCK_COLUMN_FIELDS}
        }`

/** Inline columnsBlock: override raw columns[] so person-> and other refs resolve. */
const INLINE_COLUMNS_BLOCK_COLUMNS = `"columns": @.columns[] {${COLUMNS_BLOCK_COLUMN_FIELDS}
        }`

/** Tab content block projection - same blocks as columns (eventList, text, image, form, categories, USP, review, persons, columns, etc.) */
const TAB_CONTENT_BLOCK_PROJECTION = `{
    _id,
    _type,
    ${LAYOUT_FIELDS},
    ...select(
      _type == "eventList" => {
        title,
        category,
        eventType,
        limit,
        showPastEvents
      },
      _type == "textBlock" => {
        title,
        titleSize,
        titleAlignment,
        content[] ${PT_BLOCK},
        "contentWidth": width
      },
      _type == "afbeeldingBlock" => {
        mediaType,
        image { asset->, alt },
        youtubeUrl,
        placeholderImage { asset->, alt },
        caption,
        "contentWidth": width,
        aspectRatio
      },
      _type == "whitespaceBlock" => {
        height,
        customHeight
      },
      _type == "accordionBlock" => {
        title,
        titleSize,
        items[] {
          question,
          answer[] ${PT_BLOCK}
        },
        allowMultipleOpen
      },
      _type == "formBlock" => {
        title,
        titleSize,
        introText[] { _type, _key, children, markDefs, listItem, style },
        formSource,
        form->,
        hubSpotForm,
        submitButtonLabel,
        successMessage,
        errorMessage
      },
      _type == "demandNearbyBlock" => {
        title,
        titleSize,
        introText[] { _type, _key, children, markDefs, listItem, style }
      },
      _type == "categoriesBlock" => {
        title,
        titleSize,
        introText[] { _type, _key, children, markDefs, listItem, style },
        items[] {
          source,
          category-> { _id, slug, label, image { asset-> }, linkUrl },
          label,
          image { asset-> },
          url
        },
        columnsDesktop,
        ctaEnabled,
        ctaLabel,
        ctaUrl
      },
      _type == "uspBlock" => {
        title,
        titleSize,
        items[] {
          source,
          usp-> { _id, title, description, linkEnabled, linkLabel, linkUrl },
          title,
          description[] { _type, _key, children, markDefs, listItem, style },
          linkEnabled,
          linkLabel,
          linkUrl
        },
        itemsLayout
      },
      _type == "reviewBlock" => {
        title,
        titleSize,
        ratingDisplay,
        ratingValue,
        ratingLabel,
        reviews[] { quote, authorName, authorSubtitle, starRating },
        navigationStyle
      },
      _type == "personsBlock" => {
        title,
        titleSize,
        introText[] { _type, _key, children, markDefs, listItem, style },
        dataSource,
        dynamicFilters {
          typeTags,
          subjectTags,
          exclude[] { _ref },
          maxItems,
          sort
        },
        columnsDesktop,
        searchOnPage,
        searchPlaceholder,
        ctaEnabled,
        ctaLabel,
        ctaUrl,
        ${PERSONS_BLOCK_RESOLVED_PERSONS}
      },
      _type == "columnsBlock" => {
        sectionTitle,
        sectionTitleSize,
        sectionTitleAlignment,
        introText[] { _type, _key, children, markDefs, listItem, style },
        numberOfColumns,
        columnGap,
        ${COLUMNS_BLOCK_COLUMNS_ARRAY}
      },
      {}
    )
  }`

/** Shared inner for tab `blocks[]` and in-page nav `inPageNavContent[]` (refs + inline joins). */
const TAB_PANEL_NESTED_BLOCKS_INNER = `            ...select(
              defined(@._ref) => coalesce(
                *[_id == "drafts." + @._ref][0] ${TAB_CONTENT_BLOCK_PROJECTION},
                *[_id == @._ref][0] ${TAB_CONTENT_BLOCK_PROJECTION}
              ),
              @._type == "categoriesBlock" => {
                ...@,
                ${INLINE_PAGE_BLOCK_LAYOUT},
                "items": @.items[] {
                  source,
                  "category": category-> { _id, slug, label, image { asset-> }, linkUrl },
                  label,
                  "image": image { asset-> },
                  url
                }
              },
              @._type == "uspBlock" => {
                ...@,
                ${INLINE_PAGE_BLOCK_LAYOUT},
                "items": @.items[] {
                  source,
                  "usp": usp-> { _id, title, description, linkEnabled, linkLabel, linkUrl },
                  title,
                  description[] { _type, _key, children, markDefs, listItem, style },
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
const IN_PAGE_NAV_CONTENT_ARRAY = `inPageNavContent[] { ${TAB_PANEL_NESTED_BLOCKS_INNER} }`

/** Block projection - used for referenced block resolution */
const BLOCK_PROJECTION = `{
    _id,
    _type,
    ${LAYOUT_FIELDS},
    ...select(
      _type == "editorialCardsBlock" => {
        title,
        titleSize,
        backgroundImage { asset->, alt },
        overlayOpacity,
        cards[] {
          label,
          title,
          description[] ${PT_BLOCK},
          image { asset->, alt },
          linkLabel,
          linkUrl
        }
      },
      _type == "eventList" => {
        title,
        category,
        eventType,
        limit,
        showPastEvents
      },
      _type == "textBlock" => {
        title,
        titleSize,
        titleAlignment,
        content[] ${PT_BLOCK},
        "contentWidth": width
      },
      _type == "afbeeldingBlock" => {
        mediaType,
        image { asset->, alt },
        youtubeUrl,
        placeholderImage { asset->, alt },
        caption,
        "contentWidth": width,
        aspectRatio
      },
      _type == "whitespaceBlock" => {
        height,
        customHeight
      },
      _type == "accordionBlock" => {
        title,
        titleSize,
        items[] {
          question,
          answer[] ${PT_BLOCK}
        },
        allowMultipleOpen
      },
      _type == "tabsBlock" => {
        title,
        titleSize,
        interactionMode,
        inPageNavItems[] {
          label,
          url,
          htmlAnchor
        },
        ${IN_PAGE_NAV_CONTENT_ARRAY},
        tabs[] {
          label,
          ${TAB_PANEL_BLOCKS_ARRAY}
        },
        "contentWidth": width,
        navPosition,
        anchorNavigation
      },
      _type == "formBlock" => {
        title,
        titleSize,
        introText[] { _type, _key, children, markDefs, listItem, style },
        formSource,
        form->,
        hubSpotForm,
        submitButtonLabel,
        successMessage,
        errorMessage
      },
      _type == "demandNearbyBlock" => {
        title,
        titleSize,
        introText[] { _type, _key, children, markDefs, listItem, style }
      },
      _type == "heroBlock" => {
        slides[] {
          backgroundImage { asset-> },
          overlayOpacity,
          showLogo,
          title,
          titleSize,
          subtitle,
          url,
          contentAlignment
        },
        autoplay,
        autoplayInterval,
        topPanelTitle,
        topPanelTitleSize,
        topPanelBody[] { _type, _key, children, markDefs, listItem, style },
        topPanelImage { asset->, alt },
        topPanelCtaEnabled,
        topPanelCtaLabel,
        topPanelCtaUrl,
        newsletterSignupUrl
      },
      _type == "productRowBlock" => {
        title,
        titleSize,
        sourceType,
        products[]-> { _id, handle, title },
        automatedFeed,
        titleFavorites,
        titleRecent,
        ctaEnabled,
        ctaLabel,
        ctaUrl
      },
      _type == "categoriesBlock" => {
        title,
        titleSize,
        introText[] { _type, _key, children, markDefs, listItem, style },
        items[] {
          source,
          category-> { _id, slug, label, image { asset-> }, linkUrl },
          label,
          image { asset-> },
          url
        },
        columnsDesktop,
        ctaEnabled,
        ctaLabel,
        ctaUrl
      },
      _type == "uspBlock" => {
        title,
        titleSize,
        items[] {
          source,
          usp-> { _id, title, description, linkEnabled, linkLabel, linkUrl },
          title,
          description[] { _type, _key, children, markDefs, listItem, style },
          linkEnabled,
          linkLabel,
          linkUrl
        },
        itemsLayout
      },
      _type == "reviewBlock" => {
        title,
        titleSize,
        ratingDisplay,
        ratingValue,
        ratingLabel,
        reviews[] { quote, authorName, authorSubtitle, starRating },
        navigationStyle
      },
      _type == "personsBlock" => {
        title,
        titleSize,
        introText[] { _type, _key, children, markDefs, listItem, style },
        dataSource,
        dynamicFilters {
          typeTags,
          subjectTags,
          exclude[] { _ref },
          maxItems,
          sort
        },
        columnsDesktop,
        searchOnPage,
        searchPlaceholder,
        ctaEnabled,
        ctaLabel,
        ctaUrl,
        ${PERSONS_BLOCK_RESOLVED_PERSONS}
      },
      _type == "columnsBlock" => {
        sectionTitle,
        sectionTitleSize,
        sectionTitleAlignment,
        introText[] { _type, _key, children, markDefs, listItem, style },
        numberOfColumns,
        columnGap,
        ${COLUMNS_BLOCK_COLUMNS_ARRAY}
      },
      _type == "giftCardBlock" => {
        pageTitle,
        pageTitleSize,
        intro[] ${PT_BLOCK},
        amountOptions,
        minAmountEuro,
        maxAmountEuro,
        section1Title,
        section2Title,
        customAmountLabel,
        recipientNameLabel,
        recipientEmailLabel,
        messageLabel,
        senderNameLabel,
        orderButtonLabel
      },
      {}
    )
  }`

export const PAGE_QUERY = `*[_type == "page" && slug.current == $slug][0] {
  _id,
  title,
  "slug": slug.current,
  "blocks": blocks[] {
    ...select(
      defined(@._ref) => coalesce(
        *[_id == "drafts." + @._ref][0] ${BLOCK_PROJECTION},
        *[_id == @._ref][0] ${BLOCK_PROJECTION}
      ),
      @._type == "categoriesBlock" => {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT},
        "items": @.items[] {
          source,
          "category": category-> { _id, slug, label, image { asset-> }, linkUrl },
          label,
          "image": image { asset-> },
          url
        }
      },
      @._type == "uspBlock" => {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT},
        "items": @.items[] {
          source,
          "usp": usp-> { _id, title, description, linkEnabled, linkLabel, linkUrl },
          title,
          description[] { _type, _key, children, markDefs, listItem, style },
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
      {
        ...@,
        ${INLINE_PAGE_BLOCK_LAYOUT}
      }
    )
  },
  seo {
    title,
    description,
    image
  }
}`
