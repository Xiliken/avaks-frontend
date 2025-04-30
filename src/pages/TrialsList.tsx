import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import api from '../services/api';

interface Flight {
    id: string;
    date: string;
    pilot: string;
    type: string;
}

interface Trial {
    id: string;
    name: string;
    flights: Flight[];
}

const TrialsList: React.FC = () => {
    const [trials, setTrials] = useState<Trial[]>([]);
    const [filteredTrials, setFilteredTrials] = useState<Trial[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [newTrialName, setNewTrialName] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [pilotFilter, setPilotFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');

    useEffect(() => {
        fetchTrials();
    }, []);

    const fetchTrials = async () => {
        try {
            const response = await api.get('/trials');
            setTrials(response.data);
            setFilteredTrials(response.data);
        } catch (err: any) {
            const errorMessage = err.response?.data?.msg || 'Ошибка при загрузке испытаний';
            toast.error(errorMessage);
            console.error('Error fetching trials:', err.response?.data || err);
        }
    };

    const handleCreateTrial = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTrialName.trim()) {
            toast.error('Введите название испытания');
            return;
        }

        try {
            const response = await api.post('/trials', { name: newTrialName });
            const newTrial = response.data;
            setTrials([...trials, { ...newTrial, flights: [] }]);
            setFilteredTrials([...trials, { ...newTrial, flights: [] }]);
            toast.success('Испытание успешно создано!');
            setNewTrialName('');
            setIsModalOpen(false);
        } catch (err: any) {
            const errorMessage = err.response?.data?.error || 'Ошибка при создании испытания';
            toast.error(errorMessage);
            console.error('Error creating trial:', err.response?.data || err);
        }
    };

    const applyFilters = () => {
        let filtered = [...trials];

        if (searchQuery) {
            filtered = filtered.filter((trial) =>
                trial.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        if (dateFilter) {
            filtered = filtered.map((trial) => ({
                ...trial,
                flights: trial.flights.filter((flight) =>
                    new Date(flight.date).toISOString().startsWith(dateFilter)
                ),
            })).filter((trial) => trial.flights.length > 0);
        }

        if (pilotFilter) {
            filtered = filtered.map((trial) => ({
                ...trial,
                flights: trial.flights.filter((flight) =>
                    flight.pilot.toLowerCase().includes(pilotFilter.toLowerCase())
                ),
            })).filter((trial) => trial.flights.length > 0);
        }

        if (typeFilter) {
            filtered = filtered.map((trial) => ({
                ...trial,
                flights: trial.flights.filter((flight) =>
                    flight.type.toLowerCase().includes(typeFilter.toLowerCase())
                ),
            })).filter((trial) => trial.flights.length > 0);
        }

        setFilteredTrials(filtered);
    };

    useEffect(() => {
        applyFilters();
    }, [searchQuery, dateFilter, pilotFilter, typeFilter, trials]);

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-bold text-gray-800">Испытания</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="py-2 px-4 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition duration-300"
                >
                    Создать испытание
                </button>
            </div>

            {/* Фильтры и поиск */}
            <div className="mb-6 space-y-4">
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Поиск по названию испытания..."
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-4">
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                        type="text"
                        value={pilotFilter}
                        onChange={(e) => setPilotFilter(e.target.value)}
                        placeholder="Фильтр по пилоту..."
                        className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                        type="text"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        placeholder="Фильтр по типу..."
                        className="p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
            </div>

            {/* Список испытаний */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredTrials.map((trial) => (
                    <div key={trial.id} className="bg-white p-4 rounded-lg shadow-md">
                        <div className="flex justify-between items-center mb-2">
                            <h2 className="text-xl font-semibold text-gray-800">{trial.name}</h2>
                            <Link
                                to={`/trials/${trial.id}`}
                                className="py-1 px-3 bg-green-500 text-white font-semibold rounded-md hover:bg-green-600 transition duration-300"
                            >
                                Подробности
                            </Link>
                        </div>
                        <p className="text-gray-600">Полёты: {trial.flights.length}</p>
                        {trial.flights.map((flight) => (
                            <div key={flight.id} className="mt-2">
                                <Link
                                    to={`/flights/${flight.id}`}
                                    className="text-blue-500 hover:underline"
                                >
                                    Полёт {flight.id} ({new Date(flight.date).toLocaleDateString()})
                                </Link>
                            </div>
                        ))}
                    </div>
                ))}
                {filteredTrials.length === 0 && (
                    <p className="text-gray-600">Испытания не найдены</p>
                )}
            </div>

            {/* Модальное окно */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">Создать новое испытание</h2>
                        <form onSubmit={handleCreateTrial} className="space-y-4">
                            <div>
                                <label htmlFor="trialName" className="block text-sm font-medium text-gray-700">
                                    Название испытания
                                </label>
                                <input
                                    type="text"
                                    id="trialName"
                                    value={newTrialName}
                                    onChange={(e) => setNewTrialName(e.target.value)}
                                    placeholder="Введите название"
                                    className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="flex justify-end space-x-2">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="py-2 px-4 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-300"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    className="py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-300"
                                >
                                    Создать
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrialsList;