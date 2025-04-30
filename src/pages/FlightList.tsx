import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api'; // Используем настроенный экземпляр axios
import { Flight } from '../interfaces';
import { useAuth } from '../context/AuthContext';

const FlightList: React.FC = () => {
    const [flights, setFlights] = useState<Flight[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const { logout } = useAuth();

    useEffect(() => {
        // Загружаем полеты с API
        api.get('/flights')
            .then((response) => {
                setFlights(response.data);
            })
            .catch((error) => {
                console.error('Error fetching flights:', error);
                if (error.response?.status === 401) {
                    logout(); // Перенаправляем на страницу логина
                }
            });
    }, [logout]);

    // Фильтрация полетов по поисковому запросу
    const filterFlights = flights.filter(
        (flight) =>
            flight.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
            flight.pilot.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-semibold">Список полетов</h1>

            {/* Поиск */}
            <div className="mb-6">
                <input
                    type="text"
                    placeholder="Поиск по полетам..."
                    className="w-full px-4 py-2 bg-gray-800 text-white rounded-md"
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {/* Список фильтрованных полетов */}
            <div className="space-y-4">
                {filterFlights.length > 0 ? (
                    filterFlights.map((flight) => (
                        <div key={flight.id} className="bg-white p-6 rounded-lg shadow-md flex justify-between items-center">
                            <div>
                                <h3 className="text-xl font-medium">{flight.id}</h3>
                                <p>{flight.date}</p>
                                <p>{flight.pilot}</p>
                            </div>
                            <Link to={`/flights/${flight.id}`} className="text-blue-500">
                                Подробнее
                            </Link>
                        </div>
                    ))
                ) : (
                    <p className="text-gray-500">Испытания не найдены</p>
                )}
            </div>
        </div>
    );
};

export default FlightList;