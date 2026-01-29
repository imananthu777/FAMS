import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
    children?: ReactNode;
}

interface State {
    hasError: boolean;
    error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error("Uncaught error:", error, errorInfo);

        // Auto-reload on chunk load errors (deployments)
        if (error.message.includes("dynamically imported module") || error.message.includes("Loading chunk")) {
            const lastReload = sessionStorage.getItem('chunk_reload');
            if (!lastReload || Date.now() - Number(lastReload) > 10000) {
                sessionStorage.setItem('chunk_reload', String(Date.now()));
                window.location.reload();
            }
        }
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gray-50 p-4">
                    <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100 max-w-md w-full text-center">
                        <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                            <AlertCircle className="w-8 h-8" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
                        <p className="text-gray-500 mb-6 text-sm">
                            We encountered an unexpected error. The application has been paused to prevent data loss.
                        </p>
                        <div className="bg-gray-50 p-4 rounded-lg text-left mb-6 overflow-auto max-h-40">
                            <code className="text-xs text-red-600 font-mono break-all">
                                {this.state.error?.message || "Unknown error occurred"}
                            </code>
                            {process.env.NODE_ENV === 'development' && this.state.error?.stack && (
                                <details className="mt-2">
                                    <summary className="cursor-pointer text-xs text-gray-600 hover:text-gray-800">
                                        Stack Trace (Dev Only)
                                    </summary>
                                    <pre className="text-xs mt-2 overflow-auto max-h-60 bg-gray-100 p-2 rounded">
                                        {this.state.error.stack}
                                    </pre>
                                </details>
                            )}
                        </div>
                        <Button
                            onClick={() => window.location.reload()}
                            className="w-full h-12 text-base font-medium"
                        >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Reload Application
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
