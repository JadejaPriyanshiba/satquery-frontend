import { useEffect } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";

const DEMO_AOI = [72.82, 21.12, 72.9, 21.2];

function MapControls({ onAOIChange }) {
    const map = useMap();

    useEffect(() => {
        map.pm.addControls({
            position: "topleft",
            drawMarker: false,
            drawCircle: false,
            drawCircleMarker: false,
            drawPolyline: false,
            drawPolygon: false,
            drawRectangle: true,
            editMode: true,
            dragMode: false,
            cutPolygon: false,
            removalMode: true,
        });

        const handleCreate = (event) => {
            const bounds = event.layer.getBounds();

            const bbox = [
                bounds.getWest(),
                bounds.getSouth(),
                bounds.getEast(),
                bounds.getNorth(),
            ];

            console.log("AOI BBOX:", bbox);
            onAOIChange(bbox);
        };

        map.on("pm:create", handleCreate);

        return () => {
            map.off("pm:create", handleCreate);
        };
    }, [map, onAOIChange]);

    return null;
}

function MapView({ onAOIChange }) {

    const useDemoAOI = () => {
        console.log("Using Demo AOI:", DEMO_AOI);
        onAOIChange(DEMO_AOI);
    };

    return (
        <div className="map-wrapper">

            {/* Map Header */}
            <div className="map-header">

                <div>
                    <h2>Area of Interest</h2>

                    <p>
                        Select an area on the map to analyze
                    </p>
                </div>

                <button
                    className="demo-aoi-btn"
                    onClick={useDemoAOI}
                >
                    Use Demo AOI
                </button>

            </div>

            {/* Map */}
            <div className="map-container">

                <MapContainer
                    center={[21.16, 72.86]}
                    zoom={11}
                    className="leaflet-map"
                >
                    <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <MapControls
                        onAOIChange={onAOIChange}
                    />
                </MapContainer>

            </div>

            {/* Map Hint */}
            <div className="map-hint">
                <span>▣</span>
                Draw a rectangle to define your Area of Interest
            </div>

        </div>
    );
}

export default MapView;