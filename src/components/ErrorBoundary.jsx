import { Component } from 'react';
import ErrorState from './ErrorState';
import { ERROR_MESSAGES } from '../utils/errorMessage.js';

/** Keep render failures inside their route so portal navigation remains available. */
class ErrorBoundary extends Component {
    state = { failed: false };

    static getDerivedStateFromError() {
        return { failed: true };
    }

    render() {
        if (this.state.failed) {
            return (
                <ErrorState
                    message={ERROR_MESSAGES.unexpected}
                    onRetry={() => this.setState({ failed: false })}
                />
            );
        }
        return this.props.children;
    }
}

export default ErrorBoundary;
