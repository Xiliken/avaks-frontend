// components/Sidebar.tsx
import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { HomeIcon, ClipboardDocumentIcon, PaperAirplaneIcon, ArrowLeftOnRectangleIcon } from '@heroicons/react/24/solid';

const Sidebar: React.FC = () => {
    const { logout } = useAuth();
    const location = useLocation();
    const [searchTerm, setSearchTerm] = useState('');

    // Массив с пунктами меню
    const menuItems = [
        { to: '/', icon: <HomeIcon className="w-6 h-6" />, label: 'Главная' },
        // { to: '/flights', icon: <PaperAirplaneIcon className="w-6 h-6" />, label: 'Полеты' },
        { to: '/trials', icon: <PaperAirplaneIcon className="w-6 h-6" />, label: 'Испытания' },
        { to: '/incidents', icon: <ClipboardDocumentIcon className="w-6 h-6" />, label: 'Инциденты' },
        //{ to: '/board-stats', icon: <ChartBarIcon className="w-6 h-6" />, label: 'Статистика' },
    ];

    // Фильтрация элементов меню по searchTerm
    const filteredMenuItems = menuItems.filter(item =>
        item.label.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="w-64 bg-gray-900 text-white min-h-screen p-6 flex flex-col justify-between shadow-lg">
            {/* Верхняя часть: заголовок и меню */}
            <div>
                <h2 className="text-2xl font-semibold text-center mb-8 text-blue-300">Жуковский</h2>

                {/* Поиск */}
                <div className="mb-6">
                    <input
                        type="text"
                        placeholder="Поиск..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-800 text-white rounded-md border border-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-200"
                    />
                </div>

                {/* Список меню с фильтрацией */}
                <ul>
                    {filteredMenuItems.map((item) => (
                        <li key={item.to} className="mb-4">
                            <Link
                                to={item.to}
                                className={`flex items-center space-x-4 px-4 py-2 rounded-lg hover:bg-gray-700 transition-all duration-200 transform hover:scale-105 ${
                                    location.pathname === item.to ? 'bg-gray-700 text-blue-300' : ''
                                }`}
                            >
                                {item.icon}
                                <span className="text-lg">{item.label}</span>
                            </Link>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Нижняя часть: кнопка выхода */}
            <div className="mt-6">
                <button
                    onClick={logout}
                    className="flex items-center space-x-4 w-full px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-all duration-200 transform hover:scale-105"
                >
                    <ArrowLeftOnRectangleIcon className="w-6 h-6" />
                    <span className="text-lg">Выйти</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;
