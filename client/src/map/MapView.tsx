/**
 * MapLibre map. Renders devices/marks/course from the store and rotates the
 * camera so the wind blows from the top of the screen.
 */

import { useEffect, useRef } from "react";
import maplibregl, { type StyleSpecification } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { useStore } from "../state/store";
import { COURSE_ZOOM, DEFAULT_CENTER, DEFAULT_ZOOM } from "../config";
import { registerIcons } from "./icons";
import {
  addLayers,
  courseFC,
  devicesFC,
  marksFC,
  SRC_COURSE,
  SRC_DEVICES,
  SRC_MARKS,
} from "./layers";
import { hasFix } from "../state/store";

const STYLE: StyleSpecification = {
  version: 8,
  glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf",
  sources: {
    osm: {
      type: "raster",
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
    },
  },
  layers: [{ id: "osm", type: "raster", source: "osm" }],
};

export function MapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const readyRef = useRef(false);
  const centeredRef = useRef(false);

  // Pull the slices we render from.
  const devices = useStore((s) => s.devices);
  const marks = useStore((s) => s.marks);
  const wind = useStore((s) => s.wind);
  const flagBoatId = useStore((s) => s.flagBoatId);
  const selfDeviceId = useStore((s) => s.deviceId);

  // Create the map once.
  useEffect(() => {
    if (!containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE,
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      attributionControl: { compact: true },
    });
    mapRef.current = map;
    // Expose the instance for end-to-end tests (read-only inspection).
    (window as Window & { __ezrcMap?: maplibregl.Map }).__ezrcMap = map;
    map.addControl(new maplibregl.NavigationControl({ showZoom: true }), "bottom-right");

    map.on("load", async () => {
      await registerIcons(map);
      addLayers(map);
      readyRef.current = true;
      updateSources();
    });

    return () => {
      readyRef.current = false;
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateSources() {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    (map.getSource(SRC_DEVICES) as maplibregl.GeoJSONSource | undefined)?.setData(
      devicesFC(devices, flagBoatId, selfDeviceId),
    );
    (map.getSource(SRC_MARKS) as maplibregl.GeoJSONSource | undefined)?.setData(marksFC(marks));
    (map.getSource(SRC_COURSE) as maplibregl.GeoJSONSource | undefined)?.setData(courseFC(marks));
  }

  // Push data into the map whenever state changes.
  useEffect(updateSources, [devices, marks, flagBoatId, selfDeviceId]);

  // Auto-center once we have a meaningful position.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current || centeredRef.current) return;
    const flag = flagBoatId ? devices[flagBoatId] : undefined;
    const self = devices[selfDeviceId];
    const anchor = hasFix(flag) ? flag : hasFix(self) ? self : undefined;
    if (anchor) {
      map.easeTo({ center: [anchor.lng, anchor.lat], zoom: COURSE_ZOOM });
      centeredRef.current = true;
    }
  }, [devices, flagBoatId, selfDeviceId]);

  // Rotate so the wind comes from the top. Wind direction is "from" heading,
  // which is exactly the bearing MapLibre puts at the top of the screen.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !readyRef.current) return;
    map.easeTo({ bearing: wind ? wind.directionDeg : 0, duration: 600 });
  }, [wind]);

  return <div ref={containerRef} className="map-container" />;
}
