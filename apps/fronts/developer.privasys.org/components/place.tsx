// Where something runs, the same way in every table: the place (a link to a
// map when the control plane knows its coordinates) and, in its own column,
// who operates the datacentre. Coordinates are a city's, not a building's.

import type { Place } from '~/lib/types';

// dms writes one coordinate as Google Maps' place form does: 48°51'23.8"N.
function dms(value: number, pos: string, neg: string): string {
    const abs = Math.abs(value);
    let deg = Math.floor(abs);
    let min = Math.floor((abs - deg) * 60);
    let sec = Math.round(((abs - deg) * 60 - min) * 600) / 10;
    if (sec >= 60) { sec = 0; min += 1; }
    if (min >= 60) { min = 0; deg += 1; }
    return `${deg}°${min}'${sec.toFixed(1)}"${value < 0 ? neg : pos}`;
}

export function mapsUrl(place: Place): string | null {
    if (place.latitude == null || place.longitude == null) return null;
    const lat = encodeURIComponent(dms(place.latitude, 'N', 'S'));
    const lon = encodeURIComponent(dms(place.longitude, 'E', 'W'));
    return `https://www.google.com/maps/place/${lat}+${lon}/`;
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
