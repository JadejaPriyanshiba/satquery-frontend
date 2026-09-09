import { useState } from "react";
import { uploadGeoTIFF } from "./services/api";

function GeoTIFFUploader({ onUpload }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];

        setError("");
        setFile(null);

        if (!selectedFile) {
            return;
        }

        const fileName = selectedFile.name.toLowerCase();

        const isGeoTIFF =
            fileName.endsWith(".tif") ||
            fileName.endsWith(".tiff");

        if (!isGeoTIFF) {
            setError(
                "Invalid file. Please select a GeoTIFF satellite image (.tif or .tiff)."
            );
            event.target.value = "";
            return;
        }

        setFile(selectedFile);
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Please select a GeoTIFF file first.");
            return;
        }

        try {
            setUploading(true);
            setError("");

            const result = await uploadGeoTIFF(file);

            console.log("GEOTIFF UPLOADED:", result);

            onUpload(result);
        } catch (error) {
            console.error("GEOTIFF UPLOAD ERROR:", error);

            setError(
                error.message || "Failed to upload GeoTIFF file."
            );
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="geotiff-uploader">

            <div className="upload-header">
                <div>
                    <h3>Upload GeoTIFF</h3>

                    <p>
                        Upload a GeoTIFF satellite image for analysis
                    </p>
                </div>

                <span className="file-badge">
                    .TIF
                </span>
            </div>

            <label className="file-drop-area">

                <div className="upload-icon">
                    ↑
                </div>

                <div className="upload-text">

                    <strong>
                        {file
                            ? file.name
                            : "Choose a GeoTIFF satellite image"}
                    </strong>

                    <span>
                        {file
                            ? "File selected and ready to upload"
                            : "Only .tif and .tiff files are supported"}
                    </span>

                </div>

                <span className="browse-btn">
                    Browse
                </span>

                <input
                    type="file"
                    accept=".tif,.tiff,image/tiff"
                    onChange={handleFileChange}
                    hidden
                />

            </label>

            {file && (
                <div className="selected-file">

                    <span>📄</span>

                    <div>
                        <strong>
                            {file.name}
                        </strong>

                        <small>
                            {(file.size / (1024 * 1024)).toFixed(2)} MB
                        </small>
                    </div>

                </div>
            )}

            <button
                className="upload-btn"
                onClick={handleUpload}
                disabled={!file || uploading}
            >
                {uploading
                    ? "Uploading..."
                    : "Upload GeoTIFF"}
            </button>

            {error && (
                <p className="upload-error">
                    {error}
                </p>
            )}

        </div>
    );
}

export default GeoTIFFUploader;