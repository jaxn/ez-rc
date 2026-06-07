/** Inline SVG icons loaded into the MapLibre image registry. */

import type { Map as MlMap } from "maplibre-gl";

const BOAT_SVG = `
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48">
  <g transform="translate(24,24)">
    <path d="M0,-18 C6,-6 7,6 4,16 L-4,16 C-7,6 -6,-6 0,-18 Z"
          fill="#ffffff" stroke="#0b3d61" stroke-width="2.5"/>
    <line x1="0" y1="-14" x2="0" y2="12" stroke="#0b3d61" stroke-width="2"/>
  </g>
</svg>`;

/** Load an SVG string as an HTMLImageElement for map.addImage. */
export function loadSvgImage(svg: string, size = 48): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image(size, size);
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}

export async function registerIcons(map: MlMap): Promise<void> {
  const boat = await loadSvgImage(BOAT_SVG);
  if (!map.hasImage("boat")) map.addImage("boat", boat);
}
