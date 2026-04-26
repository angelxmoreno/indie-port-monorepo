import { useAuth } from '@indieport/shared-fe';

export function DashboardPage() {
    const { user, signOut } = useAuth();

    return (
        <div style={{ maxWidth: 600, margin: '40px auto', padding: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>IndiePort Dashboard</h1>
                <button type="button" onClick={signOut} style={{ padding: '6px 12px' }}>
                    Sign out
                </button>
            </div>
            <p>Welcome, {user?.phone ?? user?.userId}</p>
        </div>
    );
}
