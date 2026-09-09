import { useEffect, useRef, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Rectangle,
    useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import "@geoman-io/leaflet-geoman-free";

const DEMO_AOIS = {
    Gujarat: [72.82, 21.12, 72.9, 21.2],
    Delhi: [77.1, 28.55, 77.15, 28.6],
    Kolkata: [88.2, 22.5, 88.3, 22.58],
};

function MapControls({ onAOIChange, selectedAOI }) {
    const map = useMap();
    const rectangleRef = useRef(null);

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

    useEffect(() => {
        if (!selectedAOI) {
            return;
        }

        const bounds = [
            [selectedAOI[1], selectedAOI[0]],
            [selectedAOI[3], selectedAOI[2]],
        ];

        map.fitBounds(bounds, {
            padding: [40, 40],
        });
    }, [map, selectedAOI]);

    return null;
}

function MapView({ onAOIChange }) {
    const [selectedAOI, setSelectedAOI] = useState(null);

    const handleDemoAOI = (name) => {
        const bbox = DEMO_AOIS[name];

        console.log(`Using ${name} Demo AOI:`, bbox);

        setSelectedAOI(bbox);
        onAOIChange(bbox);
    };

    return (
        <div className="map-wrapper">

            <div className="map-header">
                <div>
                    <h2>Area of Interest</h2>
                    <p>
                        Select an area on the map to analyze
                    </p>
                </div>

                <div className="demo-aoi-group">
                    <span className="demo-aoi-label">Demo AOI</span>

                    <div className="demo-buttons">
                        <button
                            className="demo-aoi-btn"
                            onClick={() => handleDemoAOI("Gujarat")}
                        >
                            Gujarat
                        </button>

                        <button
                            className="demo-aoi-btn"
                            onClick={() => handleDemoAOI("Delhi")}
                        >
                            Delhi
                        </button>

                        <button
                            className="demo-aoi-btn"
                            onClick={() => handleDemoAOI("Kolkata")}
                        >
                            Kolkata
                        </button>
                    </div>
                </div>
            </div>

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
                        selectedAOI={selectedAOI}
                    />

                    {selectedAOI && (
                        <Rectangle
                            bounds={[
                                [selectedAOI[1], selectedAOI[0]],
                                [selectedAOI[3], selectedAOI[2]],
                            ]}
                            pathOptions={{
                                weight: 3,
                            }}
                        />
                    )}
                </MapContainer>
            </div>

            <div className="map-hint">
                <span>▣</span>
                Draw a rectangle to define your Area of Interest
            </div>
        </div>
    );
}

export default MapView;