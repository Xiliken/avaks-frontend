// pages/CreateTrial.tsx
import React, { useState } from 'react';
import { toast } from 'react-toastify';
import api from '../services/api';

const CreateTrial: React.FC = () => {
    const [name, setName] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Введите название испытания');
            return;
        }

        try {
            const response = await api.post('/trials', { name });
            toast.success('Испытание успешно создано!');
            console.log('Trial created:', response.data);
            setName(''); // Очистка поля после успеха
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'Ошибка при создании испытания');
            console.error('Error creating trial:', err);
        }
    };

    return (
        <div className="p-6 bg-gray-100 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Создать новое испытание</h1>
            <form onSubmit={handleSubmit} className="max-w-md mx-auto bg-white p-6 rounded-lg shadow-md">
                <div className="mb-4">
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                        Название испытания
                    </label>
                    <input
                        type="text"
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Введите название"
                        className="mt-1 block w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition duration-300"
                >
                    Создать
                </button>
            </form>
        </div>
    );
};

export default CreateTrial;