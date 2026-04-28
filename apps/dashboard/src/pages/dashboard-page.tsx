import { useAuth } from '@indieport/shared-fe';
import { useNavigate } from 'react-router';

export function DashboardPage() {
    const { user, signOut } = useAuth();
    const navigate = useNavigate();

    return (
        <div style={{ maxWidth: 600, margin: '40px auto', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>IndiePort Dashboard</h1>
                <button type="button" onClick={signOut} style={{ padding: '6px 12px' }}>
                    Sign out
                </button>
            </div>
            <p>Welcome, {user?.phone ?? user?.userId}</p>

            <div style={{ marginTop: 24 }}>
                <h2>Connected Accounts</h2>
                <button
                    type="button"
                    onClick={() => navigate('/settings/instagram')}
                    style={{ padding: '10px 20px', fontSize: 16, marginTop: 8 }}
                >
                    Connect Instagram
                </button>
            </div>
        </div>
    );
}
