import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api'; // Используем настроенный экземпляр axios
import { useAuth } from '../context/AuthContext';

// Тип для инцидента
interface Incident {
    id: string;
    description: string;
    date: string;
    resolution: string;
}

const IncidentAnalysis: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { logout } = useAuth();
    const [incident, setIncident] = useState<Incident | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        if (id) {
            // Загружаем инцидент с API
            api.get(`/incidents/${id}`)
                .then((response) => {
                    setIncident(response.data);
                })
                .catch((error) => {
                    console.error('Error fetching incident:', error);
                    if (error.response?.status === 401) {
                        logout(); // Перенаправляем на страницу логина
                    }
                });
        }
    }, [id, logout]);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-semibold">Анализ инцидента для полета {id}</h1>

            {/* Поиск */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Поиск по инцидентам..."
                    className="w-full px-4 py-2 bg-gray-800 text-white rounded-md"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Данные инцидента */}
            {incident ? (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl">Детали инцидента</h2>
                    {/* Фильтруем описание инцидента по запросу */}
                    {incident.description.toLowerCase().includes(searchTerm.toLowerCase()) && (
                        <p>{incident.description}</p>
                    )}
                    <p className="mt-4">Дата: {incident.date}</p>
                    <p>Решение: {incident.resolution}</p>
                </div>
            ) : (
                <p className="text-gray-500">Инцидент не найден</p>
            )}
        </div>
    );
};

export default IncidentAnalysis;