/**
 * The map is the page.
 *
 * This component owns everything drawn on it: the basemap, the AOI the
 * user draws, the footprint of an uploaded GeoTIFF, and the evidence
 * overlay a finished job produces. The floating docks sit above it and
 * talk to it only through props and the `onAOIChange` / `onPointer`
 * callbacks — nothing outside this file touches a Leaflet handle.
 */

import { useCallback, useEffect, useRef } from "react";
import {
  ImageOverlay,
  MapContainer,
  Rectangle,
  ScaleControl,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";

import { getBasemap } from "./basemaps";
import { bboxToBounds } from "./bounds";

/**
 * Vector colours for map geometry.
 *
 * Literal hex, not `var(--...)`: Leaflet writes these into SVG
 * presentation attributes, which do not resolve custom properties. They
 * are the same two categorical slots the charts use, and both read
 * against imagery and against a light basemap.
 */
const AOI_COLOR = "#2a78d6";
const FOOTPRINT_COLOR = "#eb6834";

/* ------------------------------------------------------------------ *
 * Rectangle drawing
 * ------------------------------------------------------------------ */

function DrawController({ onAOIChange }) {
  const map = useMap();
  const drawnRef = useRef(null);

  useEffect(() => {
    map.pm.addControls({
      position: "topleft",
      drawMarker: false,
      drawCircle: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawPolygon: false,
      drawText: false,
      drawRectangle: true,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      rotateMode: false,
      removalMode: true,
    });

    const emit = (layer) => {
      const bounds = layer.getBounds();
      onAOIChange([
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ]);
    };

    const handleCreate = (event) => {
      // One AOI at a time: a second rectangle replaces the first rather
      // than leaving two shapes on screen with only one of them live.
      if (drawnRef.current && drawnRef.current !== event.layer) {
        map.removeLayer(drawnRef.current);
      }

      drawnRef.current = event.layer;
      emit(event.layer);

      event.layer.on("pm:edit", () => emit(event.layer));
      event.layer.on("pm:dragend", () => emit(event.layer));
    };

    const handleRemove = (event) => {
      if (event.layer === drawnRef.current) {
        drawnRef.current = null;
        onAOIChange(null);
      }
    };

    map.on("pm:create", handleCreate);
    map.on("pm:remove", handleRemove);

    return () => {
      map.off("pm:create", handleCreate);
      map.off("pm:remove", handleRemove);
      map.pm.removeControls();
    };
  }, [map, onAOIChange]);

  return null;
}

/* ------------------------------------------------------------------ *
 * Imperative bridges
 * ------------------------------------------------------------------ */

/** Hands the live map instance up so the docks can fly to a bbox. */
function MapBridge({ onReady }) {
  const map = useMap();

  useEffect(() => {
    onReady(map);
    // Docks open and close around the map, changing its box.
    const timer = setTimeout(() => map.invalidateSize(), 60);
    return () => clearTimeout(timer);
  }, [map, onReady]);

  return null;
}

function PointerReadout({ onPointer }) {
  useMapEvents({
    mousemove: (event) => onPointer(event.latlng.lat, event.latlng.lng),
    mouseout: () => onPointer(null, null),
  });

  return null;
}

/** Keeps Leaflet in step with the docks collapsing and expanding. */
function ResizeOnLayout({ signal }) {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => map.invalidateSize(), 240);
    return () => clearTimeout(timer);
  }, [map, signal]);

  return null;
}

/* ------------------------------------------------------------------ *
 * MapCanvas
 * ------------------------------------------------------------------ */

export default function MapCanvas({
  basemapId,
  showLabels,
  aoi,
  footprint,
  evidenceBounds,
  evidenceUrl,
  evidenceOpacity,
  evidenceVisible,
  onAOIChange,
  onPointer,
  onMapReady,
  layoutSignal,
}) {
  const basemap = getBasemap(basemapId);

  const aoiBounds = bboxToBounds(aoi);
  const footprintBounds = bboxToBounds(footprint);

  // The overlay belongs to the ground the *job* ran over, which is not
  // always what is drawn right now — the user may have moved the AOI
  // since. The caller resolves that and passes the bbox explicitly.
  const overlayBounds = bboxToBounds(evidenceBounds);

  const handleReady = useCallback(
    (map) => onMapReady?.(map),
    [onMapReady]
  );

  return (
    <div className={`map-layer${basemap.dark ? " dim-tiles" : ""}`}>
      <MapContainer
        center={[21.16, 72.86]}
        zoom={11}
        className="leaflet-map"
        zoomControl
        worldCopyJump
      >
        <TileLayer
          key={basemap.id}
          url={basemap.url}
          attribution={basemap.attribution}
          maxZoom={basemap.maxZoom}
          maxNativeZoom={basemap.maxZoom}
          subdomains={basemap.subdomains ?? "abc"}
        />

        {basemap.reference && showLabels && (
          <TileLayer
            key={`${basemap.id}-ref`}
            url={basemap.reference}
            maxZoom={basemap.maxZoom}
            maxNativeZoom={basemap.maxZoom}
            zIndex={2}
          />
        )}

        <ScaleControl position="bottomleft" imperial={false} />

        <DrawController onAOIChange={onAOIChange} />
        <MapBridge onReady={handleReady} />
        <PointerReadout onPointer={onPointer} />
        <ResizeOnLayout signal={layoutSignal} />

        {footprintBounds && (
          <Rectangle
            bounds={footprintBounds}
            pathOptions={{
              color: FOOTPRINT_COLOR,
              weight: 2,
              dashArray: "5 4",
              fillOpacity: 0.04,
            }}
          />
        )}

        {aoiBounds && (
          <Rectangle
            bounds={aoiBounds}
            pathOptions={{
              color: AOI_COLOR,
              weight: 2,
              fillOpacity: 0.06,
            }}
          />
        )}

        {evidenceUrl && evidenceVisible && overlayBounds && (
          <ImageOverlay
            url={evidenceUrl}
            bounds={overlayBounds}
            opacity={evidenceOpacity}
            className="evidence-overlay blend-screen"
            zIndex={450}
          />
        )}
      </MapContainer>
    </div>
  );
}
