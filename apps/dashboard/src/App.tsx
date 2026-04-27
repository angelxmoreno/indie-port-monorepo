import { Route, Routes } from 'react-router';
import { ProtectedRoute } from './components/protected-route';
import { DashboardPage } from './pages/dashboard-page';
import { LoginPage } from './pages/login-page';
import { SettingsInstagramPage } from './pages/settings-instagram-page';

export function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
                path="/"
                element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/settings/instagram"
                element={
                    <ProtectedRoute>
                        <SettingsInstagramPage />
                    </ProtectedRoute>
                }
            />
        </Routes>
    );
}
