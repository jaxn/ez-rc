/**
 * Builds GeoJSON FeatureCollections from store state and defines the map style
 * sources/layers. The MapLibre camera handles wind-rotation, so we only ever
 * deal in real lat/lng here.
 */

import type { Feature, FeatureCollection, LineString, Point } from "geojson";
import type { DevicePosition, Mark } from "@ezrc/shared";
import type { Map as MlMap } from "maplibre-gl";
import { formatBearing, formatDistance } from "../geo/math";
import { hasFix } from "../state/store";
import { courseLeg, relativeDevices } from "../state/selectors";

export const SRC_DEVICES = "devices";
export const SRC_MARKS = "marks";
export const SRC_COURSE = "course";

export const MARK_COLORS: Record<Mark["type"], string> = {
  pin: "#e8c100",
  windward: "#d83a3a",
  leeward: "#2e8b57",
};

const MARK_LABEL: Record<Mark["type"], string> = {
  pin: "P",
  windward: "W",
  leeward: "L",
};

export function devicesFC(
  devices: Record<string, DevicePosition>,
  flagBoatId: string | null,
  selfDeviceId: string,
): FeatureCollection<Point> {
  const rel = relativeDevices(devices, flagBoatId, selfDeviceId);
  const features: Feature<Point>[] = [];

  for (const d of Object.values(devices)) {
    if (!hasFix(d)) continue;
    const isFlag = d.deviceId === flagBoatId;
    const r = rel.find((x) => x.device.deviceId === d.deviceId);
    let label = d.name || "boat";
    if (!isFlag && r && r.distanceM != null && r.bearing != null) {
      label = `${d.name}\n${formatDistance(r.distanceM)} · ${formatBearing(r.bearing)}`;
    }
    features.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [d.lng, d.lat] },
      properties: {
        kind: isFlag ? "flag" : d.deviceId === selfDeviceId ? "self" : "other",
        label,
      },
    });
  }
  return { type: "FeatureCollection", features };
}

export function marksFC(marks: Mark[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: marks.map((m) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [m.lng, m.lat] },
      properties: { type: m.type, color: MARK_COLORS[m.type], label: MARK_LABEL[m.type] },
    })),
  };
}

export function courseFC(marks: Mark[]): FeatureCollection<LineString> {
  const leg = courseLeg(marks);
  if (!leg) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: [
            [leg.windward.lng, leg.windward.lat],
            [leg.leeward.lng, leg.leeward.lat],
          ],
        },
        properties: {},
      },
    ],
  };
}

const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

/** Register all sources + layers once the style has loaded. */
export function addLayers(map: MlMap): void {
  map.addSource(SRC_COURSE, { type: "geojson", data: EMPTY });
  map.addSource(SRC_MARKS, { type: "geojson", data: EMPTY });
  map.addSource(SRC_DEVICES, { type: "geojson", data: EMPTY });

  map.addLayer({
    id: "course-line",
    type: "line",
    source: SRC_COURSE,
    paint: {
      "line-color": "#0b3d61",
      "line-width": 2,
      "line-dasharray": [2, 2],
    },
  });

  map.addLayer({
    id: "mark-circles",
    type: "circle",
    source: SRC_MARKS,
    paint: {
      "circle-radius": 8,
      "circle-color": ["get", "color"],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  });
  map.addLayer({
    id: "mark-labels",
    type: "symbol",
    source: SRC_MARKS,
    layout: {
      "text-field": ["get", "label"],
      "text-size": 11,
      "text-font": ["Open Sans Bold"],
      "text-allow-overlap": true,
    },
    paint: { "text-color": "#ffffff" },
  });

  // Non-flag devices: colored dots.
  map.addLayer({
    id: "device-circles",
    type: "circle",
    source: SRC_DEVICES,
    filter: ["!=", ["get", "kind"], "flag"],
    paint: {
      "circle-radius": 7,
      "circle-color": ["match", ["get", "kind"], "self", "#1565c0", "#6a7b8a"],
      "circle-stroke-color": "#ffffff",
      "circle-stroke-width": 2,
    },
  });

  // Flag boat: boat icon. rotation-alignment:map so it rotates with the chart.
  map.addLayer({
    id: "flag-boat",
    type: "symbol",
    source: SRC_DEVICES,
    filter: ["==", ["get", "kind"], "flag"],
    layout: {
      "icon-image": "boat",
      "icon-size": 0.7,
      "icon-rotation-alignment": "map",
      "icon-allow-overlap": true,
    },
  });

  // Device labels (name + distance/bearing). viewport-aligned to stay upright.
  map.addLayer({
    id: "device-labels",
    type: "symbol",
    source: SRC_DEVICES,
    layout: {
      "text-field": ["get", "label"],
      "text-size": 12,
      "text-offset": [0, 1.4],
      "text-anchor": "top",
      "text-rotation-alignment": "viewport",
      "text-font": ["Open Sans Bold"],
    },
    paint: {
      "text-color": "#0b3d61",
      "text-halo-color": "#ffffff",
      "text-halo-width": 1.5,
    },
  });
}
