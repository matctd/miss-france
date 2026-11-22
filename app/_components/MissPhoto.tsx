'use client';

import { useState } from 'react';
import { photoUrlFor } from '@/lib/photos';
import { LABELS } from '@/lib/labels';

/**
 * Portrait d'une candidate, affiché au-dessus du nom de sa région.
 * L'image reste hébergée par sa source (aucune copie dans le dépôt) ;
 * si elle est indisponible, un repli discret (initiale de la région) est affiché.
 */
export function MissPhoto({ region, size = 56 }: { region: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const url = photoUrlFor(region);
  if (!url || failed) {
    return (
      <span
        className="miss-photo miss-photo-fallback"
        style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
      >
        {region.charAt(0)}
      </span>
    );
  }
  return (
    <img
      className="miss-photo"
      style={{ width: size, height: size }}
      src={url}
      alt={LABELS.joueur.missPhotoAlt(region)}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}
