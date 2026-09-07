const API_URL = "http://127.0.0.1:8000";

export async function createJob({ question, aoi, dates, imageRef = null }) {
  const body = {
    query: question,
    aoi: {
      bbox: aoi,
      crs: "EPSG:4326",
    },
    dates: dates,
  };

  // Only send image_ref when we actually have one
  if (imageRef) {
    body.image_ref = imageRef;
  }

  const response = await fetch(`${API_URL}/jobs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok) {
    const detail = data.detail;

    throw new Error(
      typeof detail === "string"
        ? detail
        : JSON.stringify(detail)
    );
  }

  return data;
}

export async function getJob(jobId) {
  const response = await fetch(`${API_URL}/jobs/${jobId}`);

  const data = await response.json();

  if (!response.ok) {
    const detail = data.detail;

    throw new Error(
      typeof detail === "string"
        ? detail
        : JSON.stringify(detail)
    );
  }

  return data;
}

// Get audit trail for a job
export async function getJobAudit(jobId) {
  const response = await fetch(`${API_URL}/jobs/${jobId}/audit`);

  const data = await response.json();

  if (!response.ok) {
    const detail = data.detail;

    throw new Error(
      typeof detail === "string"
        ? detail
        : JSON.stringify(detail)
    );
  }

  return data;
}
export function downloadReport(result, audit = []) {
  const report = {
    job_id: result.job_id,
    status: result.status,
    answer: result.answer,
    confidence: result.confidence,
    verified: result.verified,
    evidence: result.evidence,
    audit_trail: audit,
  };

  const json = JSON.stringify(report, null, 2);

  const blob = new Blob([json], {
    type: "application/json",
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `satquery-report-${result.job_id}.json`;

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
export async function uploadGeoTIFF(file) {
  const formData = new FormData();

  formData.append("file", file);

  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  const data = await response.json();

  if (!response.ok) {
    const detail = data.detail;

    throw new Error(
      typeof detail === "string"
        ? detail
        : JSON.stringify(detail)
    );
  }

  return data;
}