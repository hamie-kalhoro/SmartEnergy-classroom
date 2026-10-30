import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';

// Keeps a failure inside one optional section, leaving the sidebar and other pages usable.
class SectionBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        console.error(`${this.props.title} failed:`, error, errorInfo);
    }

    render() {
        if (!this.state.hasError) return this.props.children;
        return (
            <div className="p-5 text-center" role="alert">
                <FiAlertCircle size={36} color="#ef4444" className="mb-3" />
                <h3>{this.props.title} could not load</h3>
                <p className="text-muted">The rest of the application is unaffected.</p>
                <button type="button" className="btn btn-primary mt-2" onClick={() => window.location.reload()}>Try again</button>
            </div>
        );
    }
}

export default SectionBoundary;
