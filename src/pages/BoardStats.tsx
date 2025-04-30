import React from 'react';

const BoardStats: React.FC = () => {
    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-semibold">Board Statistics</h1>
            <div className="space-y-4">
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <h2 className="text-xl">Flight Hours: 350</h2>
                    <p>Status: Active</p>
                </div>
            </div>
        </div>
    );
};

export default BoardStats;