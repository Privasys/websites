// Where something runs, the same way in every table: the place (a link to a
// map when the control plane knows its coordinates) and, in its own column,
// who operates the datacentre. Coordinates are a city's, not a building's.

import type { Place } from '~/lib/types';

// mapsUrl opens the place in Google Maps, in satellite view (data=!3m1!1e3).
// Google treats short coordinates as a search and snaps to the nearest
// landmark, so they are written in full (latitude to 14 decimals, longitude
// to 16) to pin the exact point.
export function mapsUrl(place: Place): string | null {
    if (place.latitude == null || place.longitude == null) return null;
    return `https://www.google.com/maps/place/${place.latitude.toFixed(14)},${place.longitude.toFixed(16)}/data=!3m1!1e3`;
}

export function PlaceLabel({ place, fallback }: { place?: Place | null; fallback?: string }) {
    if (!place) return <span>{fallback || 'Unknown'}</span>;
    const url = mapsUrl(place);
    if (!url) return <span title={place.code}>{place.label}</span>;
    return (
        <a
            href={url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} title={place.code ? `${place.code}, open in Google Maps` : 'Open in Google Maps'}
            className="underline decoration-black/20 dark:decoration-white/20 underline-offset-2 hover:decoration-current"
        >
            {place.label}
        </a>
    );
}

export function Datacentre({ place, fallback }: { place?: Place | null; fallback?: string }) {
    const name = place?.datacentre || fallback;
    return name ? <span>{name}</span> : <span className="text-black/30 dark:text-white/30">Unknown</span>;
}
