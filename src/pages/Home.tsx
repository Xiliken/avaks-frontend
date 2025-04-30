// pages/Home.tsx
import React from 'react';

const Home: React.FC = () => {
    return (
        <div className="flex-1 p-6 bg-gray-100 min-h-screen">
            <div className="max-w-4xl mx-auto text-center">
                <h1 className="text-4xl font-bold text-gray-800 mb-4">Добро пожаловать в Жуковский</h1>
                <p className="text-lg text-gray-600 mb-8">
                    Управляйте своими полетами, анализируйте данные и делитесь результатами с командой.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <a
                        href="/flights"
                        className="p-6 bg-blue-500 text-white rounded-lg shadow-md hover:bg-blue-600 transition duration-300 transform hover:scale-105"
                    >
                        <h2 className="text-xl font-semibold">Список полетов</h2>
                        <p className="mt-2">Просмотрите все доступные полеты</p>
                    </a>
                    <a
                        href="/trials"
                        className="p-6 bg-green-500 text-white rounded-lg shadow-md hover:bg-green-600 transition duration-300 transform hover:scale-105"
                    >
                        <h2 className="text-xl font-semibold">Испытания</h2>
                        <p className="mt-2">Управляйте испытаниями и добавляйте новые</p>
                    </a>
                </div>
            </div>
        </div>
    );
};

export default Home;