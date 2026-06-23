'use client';

import { useState } from 'react';

/**
 * PoliticianAvatar — renders an official portrait when available, gracefully
 * falling back to an initials placeholder when there is no image OR when the
 * image fails to load (e.g. a governor with no bioguide portrait, a demo entry,
 * or a member whose photo is missing upstream). Designed to fill its sized,
 * rounded parent container.
 */
export default function PoliticianAvatar({
  name,
  firstName,
  lastName,
  imageUrl,
  textClassName = 'font-bold text-[#d4ac52]',
}: {
  name: string;
  firstName?: string;
  lastName?: string;
  imageUrl?: string;
  textClassName?: string;
}) {
  const [failed, setFailed] = useState(false);

  const initials =
    `${(firstName?.[0] ?? name?.[0] ?? '').toUpperCase()}${(lastName?.[0] ?? '').toUpperCase()}` ||
    '?';

  if (imageUrl && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={name}
        onError={() => setFailed(true)}
        className="w-full h-full object-cover object-top"
      />
    );
  }

  return <span className={textClassName}>{initials}</span>;
}
