import { getApiClient, useAuth } from '@indieport/shared-fe';
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';

interface Connection {
    id: string;
    provider: string;
    scopes: string[];
    tokenExpiresAt: string | null;
    createdAt: string;
    modifiedAt: string;
}

export function SettingsInstagramPage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [fetchingConnections, setFetchingConnections] = useState(true);

    const connected = searchParams.get('connected');
    const callbackError = searchParams.get('error');

    useEffect(() => {
        async function loadConnections() {
            const client = getApiClient();
            if (!client) {
                setFetchingConnections(false);
                return;
            }
            try {
                const { connections } = await client.request<{ connections: Connection[] }>('/api/me/connections');
                setConnections(connections);
            } catch {
                // Ignore — connections list is not critical
            } finally {
                setFetchingConnections(false);
            }
        }
        void loadConnections();
    }, []);

    async function handleConnect() {
        setError(null);
        setLoading(true);

        const client = getApiClient();
        if (!client) {
            setError('API client not initialized');
            setLoading(false);
            return;
        }

        try {
            const { authUrl } = await client.request<{ authUrl: string }>('/api/oauth/instagram');
            window.location.href = authUrl;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to start OAuth flow');
            setLoading(false);
        }
    }

    const instagramConnection = connections.find((c) => c.provider === 'instagram');

    return (
        <div style={{ maxWidth: 600, margin: '40px auto', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Instagram Settings</h1>
                <button type="button" onClick={() => navigate('/')} style={{ padding: '6px 12px' }}>
                    Back to Dashboard
                </button>
            </div>

            <p>Connect your Instagram account to pull content into your portfolio.</p>

            {connected === 'true' && (
                <div
                    style={{
                        padding: '12px 16px',
                        backgroundColor: '#d1fae5',
                        color: '#065f46',
                        borderRadius: 6,
                        marginBottom: 16,
                    }}
                >
                    Instagram connected successfully.
                </div>
            )}

            {connected === 'false' && callbackError && (
                <div
                    style={{
                        padding: '12px 16px',
                        backgroundColor: '#fee2e2',
                        color: '#991b1b',
                        borderRadius: 6,
                        marginBottom: 16,
                    }}
                >
                    Connection failed: {callbackError}
                </div>
            )}

            {fetchingConnections ? (
                <p style={{ color: '#6b7280' }}>Loading connections...</p>
            ) : instagramConnection ? (
                <div
                    style={{
                        padding: 16,
                        backgroundColor: '#eff6ff',
                        borderRadius: 6,
                        marginBottom: 16,
                    }}
                >
                    <h3 style={{ marginTop: 0 }}>Instagram Connected</h3>
                    <p style={{ margin: '4px 0' }}>
                        <strong>Connected since:</strong> {new Date(instagramConnection.createdAt).toLocaleDateString()}
                    </p>
                    <p style={{ margin: '4px 0' }}>
                        <strong>Last updated:</strong> {new Date(instagramConnection.modifiedAt).toLocaleDateString()}
                    </p>
                    <p style={{ margin: '4px 0' }}>
                        <strong>Scopes:</strong> {instagramConnection.scopes.join(', ')}
                    </p>
                    {instagramConnection.tokenExpiresAt && (
                        <p style={{ margin: '4px 0' }}>
                            <strong>Token expires:</strong>{' '}
                            {new Date(instagramConnection.tokenExpiresAt).toLocaleDateString()}
                        </p>
                    )}
                    <button
                        type="button"
                        onClick={handleConnect}
                        disabled={loading}
                        style={{ padding: '8px 16px', marginTop: 8 }}
                    >
                        {loading ? 'Connecting...' : 'Reconnect Instagram'}
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={handleConnect}
                    disabled={loading}
                    style={{ padding: '10px 20px', fontSize: 16 }}
                >
                    {loading ? 'Connecting...' : 'Connect Instagram'}
                </button>
            )}

            {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}

            <div style={{ marginTop: 24, padding: 16, backgroundColor: '#f3f4f6', borderRadius: 6 }}>
                <h3 style={{ marginTop: 0 }}>Current User</h3>
                <p>Phone: {user?.phone ?? 'N/A'}</p>
                <p>User ID: {user?.userId ?? 'N/A'}</p>
            </div>
        </div>
    );
}
