import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import api from '../services/api';

interface Flight {
    id: string;
    date: string;
    pilot: string;
    type: string;
}

interface Equipment {
    id: number;
    name: string;
    serial_number: string;
    description: string;
}

interface Trial {
    id: string;
    name: string;
    created_at: string;
    flights: Flight[];
    equipment: Equipment[];
}

const flightTypeLabels: { [key: string]: string } = {
    acceptance: 'Приёмо-сдаточный',
    experimental: 'Экспериментальный',
    resource: 'Ресурсный',
    operational: 'Эксплуатационный'
};

const flightTypeColors: { [key: string]: string } = {
    acceptance: 'bg-green-500',
    experimental: 'bg-blue-500',
    resource: 'bg-yellow-500',
    operational: 'bg-purple-500'
};

const TrialDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [trial, setTrial] = useState<Trial | null>(null);
    const [isEditingTrialName, setIsEditingTrialName] = useState(false);
    const [trialName, setTrialName] = useState('');
    const [dateFilter, setDateFilter] = useState('');
    const [pilotFilter, setPilotFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [filteredFlights, setFilteredFlights] = useState<Flight[]>([]);
    const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
    const [newEquipment, setNewEquipment] = useState({ name: '', serial_number: '', description: '' });
    const [isFlightModalOpen, setIsFlightModalOpen] = useState(false);
    const [newFlight, setNewFlight] = useState({ date: '', pilot: '', type: '' });
    const [editingFlight, setEditingFlight] = useState<Flight | null>(null);

    useEffect(() => {
        fetchTrial();
    }, [id]);

    const fetchTrial = async () => {
        try {
            const response = await api.get('/trials');
            const foundTrial = response.data.find((t: Trial) => t.id === id);
            if (foundTrial) {
                setTrial(foundTrial);
                setTrialName(foundTrial.name);
                setFilteredFlights(foundTrial.flights);
            } else {
                toast.error('Испытание не найдено');
            }
        } catch (err) {
            toast.error('Ошибка при загрузке испытания');
            console.error('Error fetching trial:', err);
        }
    };

    const handleEditTrialName = async () => {
        if (!trialName.trim()) {
            toast.error('Название не может быть пустым');
            return;
        }
        try {
            await api.put(`/trials/${id}`, { name: trialName });
            setTrial((prev) => prev ? { ...prev, name: trialName } : null);
            setIsEditingTrialName(false);
            toast.success('Название обновлено');
        } catch (err) {
            toast.error('Ошибка при обновлении названия');
            console.error('Error updating trial:', err);
        }
    };

    const applyFilters = () => {
        if (!trial) return;
        let filtered = [...trial.flights];

        if (dateFilter) {
            filtered = filtered.filter((flight) =>
                new Date(flight.date).toISOString().startsWith(dateFilter)
            );
        }

        if (pilotFilter) {
            filtered = filtered.filter((flight) =>
                flight.pilot.toLowerCase().includes(pilotFilter.toLowerCase())
            );
        }

        if (typeFilter) {
            filtered = filtered.filter((flight) =>
                flight.type.toLowerCase().includes(typeFilter.toLowerCase())
            );
        }

        setFilteredFlights(filtered);
    };

    useEffect(() => {
        applyFilters();
    }, [dateFilter, pilotFilter, typeFilter, trial]);

    const handleAddEquipment = async () => {
        if (!newEquipment.name.trim()) {
            toast.error('Название оборудования обязательно');
            return;
        }
        try {
            const response = await api.post(`/trials/${id}/equipment`, newEquipment);
            setTrial((prev) =>
                prev ? { ...prev, equipment: [...prev.equipment, response.data] } : null
            );
            setNewEquipment({ name: '', serial_number: '', description: '' });
            setIsEquipmentModalOpen(false);
            toast.success('Оборудование добавлено');
        } catch (err) {
            toast.error('Ошибка при добавлении оборудования');
            console.error('Error adding equipment:', err);
        }
    };

    const handleAddFlight = async () => {
        if (!newFlight.type.trim()) {
            toast.error('Тип полёта обязателен');
            return;
        }
        try {
            const response = await api.post(`/trials/${id}/flights`, newFlight);
            setTrial((prev) =>
                prev ? { ...prev, flights: [...prev.flights, response.data] } : null
            );
            setFilteredFlights((prev) => [...prev, response.data]);
            setNewFlight({ date: '', pilot: '', type: '' });
            setIsFlightModalOpen(false);
            toast.success('Полёт добавлен');
        } catch (err) {
            toast.error('Ошибка при добавлении полёта');
            console.error('Error adding flight:', err);
        }
    };

    const handleEditFlight = async () => {
        if (!editingFlight || !editingFlight.type.trim()) {
            toast.error('Тип полёта обязателен');
            return;
        }
        try {
            const response = await api.put(`/flights/${editingFlight.id}`, editingFlight);
            setTrial((prev) =>
                prev ? {
                    ...prev,
                    flights: prev.flights.map((f) => (f.id === editingFlight.id ? response.data : f))
                } : null
            );
            setFilteredFlights((prev) =>
                prev.map((f) => (f.id === editingFlight.id ? response.data : f))
            );
            setEditingFlight(null);
            setIsFlightModalOpen(false);
            toast.success('Полёт обновлён');
        } catch (err) {
            toast.error('Ошибка при редактировании полёта');
            console.error('Error editing flight:', err);
        }
    };

    const handleDeleteFlight = async (flightId: string) => {
        if (!confirm('Вы уверены, что хотите удалить этот полёт?')) return;
        try {
            await api.delete(`/flights/${flightId}`);
            setTrial((prev) =>
                prev ? { ...prev, flights: prev.flights.filter((f) => f.id !== flightId) } : null
            );
            setFilteredFlights((prev) => prev.filter((f) => f.id !== flightId));
            toast.success('Полёт удалён');
        } catch (err) {
            toast.error('Ошибка при удалении полёта');
            console.error('Error deleting flight:', err);
        }
    };

    const handleFlightClick = (flightId: string) => {
        navigate(`/flights/${flightId}`);
    };

    if (!trial) return <div className="p-6">Загрузка...</div>;

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="flex justify-between items-center mb-4">
                    {isEditingTrialName ? (
                        <div className="flex gap-2 items-center">
                            <input
                                type="text"
                                value={trialName}
                                onChange={(e) => setTrialName(e.target.value)}
                                className="p-2 border rounded-md"
                            />
                            <button
                                onClick={handleEditTrialName}
                                className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                            >
                                Сохранить
                            </button>
                            <button
                                onClick={() => setIsEditingTrialName(false)}
                                className="p-2 bg-gray-300 rounded-md hover:bg-gray-400"
                            >
                                Отмена
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2 items-center">
                            <h1 className="text-2xl font-bold">{trial.name}</h1>
                            <button
                                onClick={() => setIsEditingTrialName(true)}
                                className="p-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                            >
                                Редактировать
                            </button>
                        </div>
                    )}
                </div>
                <p className="text-gray-600">Создано: {new Date(trial.created_at).toLocaleString()}</p>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Оборудование</h2>
                    <button
                        onClick={() => setIsEquipmentModalOpen(true)}
                        className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                    >
                        Добавить оборудование
                    </button>
                </div>
                {trial.equipment.length > 0 ? (
                    <ul className="space-y-2">
                        {trial.equipment.map((equip) => (
                            <li key={equip.id} className="p-2 border rounded-md">
                                <strong>{equip.name}</strong> (Серийный №: {equip.serial_number || 'Нет'})
                                <p className="text-gray-600">{equip.description || 'Нет описания'}</p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-gray-600">Оборудование не добавлено</p>
                )}
            </div>

            <div className="bg-white p-4 rounded-lg shadow-md mb-6">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Полёты</h2>
                    <button
                        onClick={() => setIsFlightModalOpen(true)}
                        className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                    >
                        Добавить полёт
                    </button>
                </div>
                <div className="flex gap-4 mb-4">
                    <input
                        type="date"
                        value={dateFilter}
                        onChange={(e) => setDateFilter(e.target.value)}
                        className="p-2 border rounded-md"
                    />
                    <input
                        type="text"
                        value={pilotFilter}
                        onChange={(e) => setPilotFilter(e.target.value)}
                        placeholder="Фильтр по пилоту"
                        className="p-2 border rounded-md"
                    />
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="p-2 border rounded-md"
                    >
                        <option value="">Все типы</option>
                        <option value="acceptance">Приёмо-сдаточные</option>
                        <option value="experimental">Экспериментальные</option>
                        <option value="resource">Ресурсные</option>
                        <option value="operational">Эксплуатационные</option>
                    </select>
                </div>
                <ul className="space-y-2">
                    {filteredFlights.map((flight) => (
                        <li
                            key={flight.id}
                            className="p-2 border rounded-md flex justify-between items-center cursor-pointer hover:bg-gray-100"
                            onClick={() => handleFlightClick(flight.id)}
                        >
                            <div className="flex items-center gap-2">
                                <span
                                    className={`w-4 h-4 rounded-full ${flightTypeColors[flight.type] || 'bg-gray-500'}`}
                                />
                                <span>
                                    <strong>{flight.id}</strong> - {new Date(flight.date).toLocaleString()} ({flight.pilot}, {flightTypeLabels[flight.type] || flight.type})
                                </span>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingFlight(flight);
                                        setIsFlightModalOpen(true);
                                    }}
                                    className="p-1 bg-yellow-500 text-white rounded-md hover:bg-yellow-600"
                                >
                                    Редактировать
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteFlight(flight.id);
                                    }}
                                    className="p-1 bg-red-500 text-white rounded-md hover:bg-red-600"
                                >
                                    Удалить
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
                {filteredFlights.length === 0 && <p className="text-gray-600">Полёты не найдены</p>}
            </div>

            {isEquipmentModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">Добавить оборудование</h2>
                        <div className="space-y-4">
                            <input
                                type="text"
                                value={newEquipment.name}
                                onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                                placeholder="Название"
                                className="w-full p-2 border rounded-md"
                            />
                            <input
                                type="text"
                                value={newEquipment.serial_number}
                                onChange={(e) => setNewEquipment({ ...newEquipment, serial_number: e.target.value })}
                                placeholder="Серийный номер (опционально)"
                                className="w-full p-2 border rounded-md"
                            />
                            <textarea
                                value={newEquipment.description}
                                onChange={(e) => setNewEquipment({ ...newEquipment, description: e.target.value })}
                                placeholder="Описание (опционально)"
                                className="w-full p-2 border rounded-md"
                            />
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => setIsEquipmentModalOpen(false)}
                                    className="p-2 bg-gray-300 rounded-md hover:bg-gray-400"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={handleAddEquipment}
                                    className="p-2 bg-green-500 text-white rounded-md hover:bg-green-600"
                                >
                                    Добавить
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isFlightModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                    <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
                        <h2 className="text-2xl font-bold mb-4">
                            {editingFlight ? 'Редактировать полёт' : 'Добавить полёт'}
                        </h2>
                        <div className="space-y-4">
                            <input
                                type="datetime-local"
                                value={editingFlight ? editingFlight.date.slice(0, 16) : newFlight.date}
                                onChange={(e) => {
                                    editingFlight
                                        ? setEditingFlight({ ...editingFlight, date: e.target.value })
                                        : setNewFlight({ ...newFlight, date: e.target.value });
                                }}
                                className="w-full p-2 border rounded-md"
                            />
                            <input
                                type="text"
                                value={editingFlight ? editingFlight.pilot : newFlight.pilot}
                                onChange={(e) => {
                                    editingFlight
                                        ? setEditingFlight({ ...editingFlight, pilot: e.target.value })
                                        : setNewFlight({ ...newFlight, pilot: e.target.value });
                                }}
                                placeholder="Пилот"
                                className="w-full p-2 border rounded-md"
                            />
                            <select
                                value={editingFlight ? editingFlight.type : newFlight.type}
                                onChange={(e) => {
                                    editingFlight
                                        ? setEditingFlight({ ...editingFlight, type: e.target.value })
                                        : setNewFlight({ ...newFlight, type: e.target.value });
                                }}
                                className="w-full p-2 border rounded-md"
                            >
                                <option value="">Выберите тип</option>
                                <option value="acceptance">Приёмо-сдаточные</option>
                                <option value="experimental">Экспериментальные</option>
                                <option value="resource">Ресурсные</option>
                                <option value="operational">Эксплуатационные</option>
                            </select>
                            <div className="flex justify-end gap-2">
                                <button
                                    onClick={() => {
                                        setIsFlightModalOpen(false);
                                        setEditingFlight(null);
                                    }}
                                    className="p-2 bg-gray-300 rounded-md hover:bg-gray-400"
                                >
                                    Отмена
                                </button>
                                <button
                                    onClick={editingFlight ? handleEditFlight : handleAddFlight}
                                    className="p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                                >
                                    {editingFlight ? 'Сохранить' : 'Добавить'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TrialDetails;