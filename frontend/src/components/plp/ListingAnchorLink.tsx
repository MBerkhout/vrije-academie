'use client'

import Link from 'next/link'
import type { ComponentProps } from 'react'
import { markListingReturnAnchor } from '@/lib/listing-return-anchor'

type ListingAnchorLinkProps = ComponentProps<typeof Link> & {
  anchorId: string
}

export function ListingAnchorLink({
  anchorId,
  onClick,
  ...props
}: ListingAnchorLinkProps) {
  return (
    <Link
      {...props}
      onClick={(event) => {
        markListingReturnAnchor(anchorId)
        onClick?.(event)
      }}
    />
  )
}
