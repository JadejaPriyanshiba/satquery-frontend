import { useState } from "react";
import { uploadGeoTIFF } from "./services/api";

function GeoTIFFUploader({ onUpload }) {
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");

    const handleFileChange = (event) => {
        const selectedFile = event.target.files[0];

        setError("");

        if (!selectedFile) {
            setFile(null);
            return;
        }

        const isGeoTIFF =
            selectedFile.name.toLowerCase().endsWith(".tif") ||
            selectedFile.name.toLowerCase().endsWith(".tiff");

        if (!isGeoTIFF) {
            setFile(null);
            setError("Please select a GeoTIFF file (.tif or .tiff).");
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
            setError(error.message);
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
                        Upload satellite imagery for analysis
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
                            : "Choose a GeoTIFF file"}
                    </strong>

                    <span>
                        {file
                            ? "File selected and ready to upload"
                            : "Supported formats: .tif, .tiff"}
                    </span>
                </div>

                <span className="browse-btn">
                    Browse
                </span>

                <input
                    type="file"
                    accept=".tif,.tiff"
                    onChange={handleFileChange}
                    hidden
                />
            </label>

            {file && (
                <div className="selected-file">
                    <span>📄</span>

                    <div>
                        <strong>{file.name}</strong>
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