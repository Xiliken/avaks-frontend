import React from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import FlightList from './pages/FlightList';
import IncidentAnalysis from './pages/IncidentAnalysis';
import BoardStats from './pages/BoardStats';
import TrialsList from './pages/TrialsList';
import TrialDetails from './pages/TrialDetails'; // Добавляем импорт
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Home from './pages/Home';
import { AuthProvider, useAuth } from './context/AuthContext';
import SharePage from './pages/SharePage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Error Boundary Component
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: string | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error: error.message };
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="p-4">
                    <h1 className="text-2xl font-bold text-red-600">Произошла ошибка</h1>
                    <p>{this.state.error}</p>
                </div>
            );
        }
        return this.props.children;
    }
}

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { token } = useAuth();
    const location = useLocation();

    console.log('ProtectedRoute token:', token);

    if (!token) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    return <>{children}</>;
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <ErrorBoundary>
                <div className="flex">
                    <Routes>
                        <Route path="/login" element={<Login />} />
                        <Route path="/share/:token" element={<SharePage />} />
                        <Route
                            path="/"
                            element={
                                <ProtectedRoute>
                                    <Sidebar />
                                    <Home />
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/flights"
                            element={
                                <ProtectedRoute>
                                    <Sidebar />
                                    <div className="flex-1 p-6">
                                        <FlightList />
                                    </div>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/incidents"
                            element={
                                <ProtectedRoute>
                                    <Sidebar />
                                    <div className="flex-1 p-6">
                                        <IncidentAnalysis />
                                    </div>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/flights/:id"
                            element={
                                <ProtectedRoute>
                                    <Sidebar />
                                    <div className="flex-1 p-6">
                                        <Dashboard />
                                    </div>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/board-stats"
                            element={
                                <ProtectedRoute>
                                    <Sidebar />
                                    <div className="flex-1 p-6">
                                        <BoardStats />
                                    </div>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/trials"
                            element={
                                <ProtectedRoute>
                                    <Sidebar />
                                    <div className="flex-1 p-6">
                                        <TrialsList />
                                    </div>
                                </ProtectedRoute>
                            }
                        />
                        <Route
                            path="/trials/:id"
                            element={
                                <ProtectedRoute>
                                    <Sidebar />
                                    <div className="flex-1 p-6">
                                        <TrialDetails />
                                    </div>
                                </ProtectedRoute>
                            }
                        />
                    </Routes>
                </div>
                <ToastContainer
                    position="top-right"
                    autoClose={3000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                />
            </ErrorBoundary>
        </AuthProvider>
    );
};

export default App;
