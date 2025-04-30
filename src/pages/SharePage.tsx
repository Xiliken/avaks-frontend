import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Dashboard from "./Dashboard.tsx";

const SharePage: React.FC = () => {
    const { token } = useParams<{ token: string }>();
    const [trialId, setTrialId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const validateLink = async () => {
            try {
                const response = await fetch(`http://localhost:5000/api/share/${token}`);
                if (!response.ok) {
                    const err = await response.json();
                    throw new Error(err.error);
                }

                const data = await response.json();
                setTrialId(data.trial_id);
            } catch (err: any) {
                setError(err.message);
                setTimeout(() => navigate('/login'), 3000);
            }
        };

        validateLink();
    }, [token, navigate]);

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p className="text-red-500">{error}. Перенаправляем на страницу входа...</p>
            </div>
        );
    }

    if (!trialId) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <p>Проверка ссылки...</p>
            </div>
        );
    }

    return <Dashboard />;
};

export default SharePage;