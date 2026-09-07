function AuditTimeline({ audit }) {
    const events = audit?.events || [];

    if (events.length === 0) {
        return (
            <div className="audit-panel">
                <div className="audit-header">
                    <div>
                        <h2>Audit Trail</h2>
                        <p>Analysis processing history</p>
                    </div>

                    <span className="audit-count">0 Events</span>
                </div>

                <div className="audit-empty">
                    <span>◌</span>
                    <p>No audit events available.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="audit-panel">
            <div className="audit-header">
                <div>
                    <h2>Audit Trail</h2>
                    <p>Analysis processing history</p>
                </div>

                <span className="audit-count">
                    {events.length} {events.length === 1 ? "Event" : "Events"}
                </span>
            </div>

            <div className="audit-timeline">
                {events.map((event, index) => (
                    <div className="audit-event" key={index}>

                        <div className="audit-marker">
                            {index + 1}
                        </div>

                        <div className="audit-line"></div>

                        <div className="audit-card">

                            <div className="audit-card-header">
                                <strong>
                                    {event.step}
                                </strong>

                                <span>
                                    {event.timestamp
                                        ? new Date(event.timestamp).toLocaleString()
                                        : "—"}
                                </span>
                            </div>

                            <div className="audit-section">
                                <span className="audit-label">
                                    PARAMETERS
                                </span>

                                <pre>
                                    {JSON.stringify(
                                        event.params || {},
                                        null,
                                        2
                                    )}
                                </pre>
                            </div>

                            <div className="audit-section">
                                <span className="audit-label">
                                    OUTPUT
                                </span>

                                <p className="audit-output">
                                    {event.output_summary || "No output available"}
                                </p>
                            </div>

                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default AuditTimeline;