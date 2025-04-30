import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getFlightDetails } from '../services/api.ts';
import { FlightDetailsData } from '../types';
import { useAuth } from '../context/AuthContext';

const FlightDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>(); // Получаем параметр из URL
    const { logout } = useAuth();
    //const navigate = useNavigate();
    const [flightDetails, setFlightDetails] = useState<FlightDetailsData | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    // Загрузка данных о полете
    useEffect(() => {
        if (id) {
            setLoading(true);
            getFlightDetails(id)
                .then((response) => {
                    setFlightDetails(response.data);
                })
                .catch((error) => {
                    console.error('Error fetching flight details:', error);
                    if (error.response?.status === 401) {
                        logout(); // Перенаправляем на страницу логина через logout
                    }
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [id, logout]);

    if (loading) {
        return <div className="p-6">Loading...</div>;
    }

    if (!flightDetails) {
        return <div className="p-6">Flight not found</div>;
    }

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-3xl font-semibold">Flight Details: {flightDetails.flightId}</h1>
            <div className="bg-white p-6 rounded-lg shadow-md space-y-4">
                <div>
                    <h2 className="text-xl font-medium">General Information</h2>
                    <p><strong>Date:</strong> {flightDetails.date}</p>
                    <p><strong>Pilot:</strong> {flightDetails.pilot}</p>
                    <p><strong>Status:</strong> {flightDetails.status}</p>
                </div>

                <div>
                    <h2 className="text-xl font-medium">Flight Logs</h2>
                    <ul className="space-y-2">
                        {flightDetails.logs.map((log, index) => (
                            <li key={index} className="bg-gray-100 p-3 rounded-md">
                                <strong>{log.type}</strong>: {log.message}
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h2 className="text-xl font-medium">Videos</h2>
                    <div className="space-y-2">
                        {flightDetails.videos.map((video, index) => (
                            <div key={index} className="bg-gray-100 p-3 rounded-md">
                                <p><strong>Video {index + 1}</strong></p>
                                <video controls className="w-full">
                                    <source src={video.url} type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                            </div>
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-medium">Photos</h2>
                    <div className="grid grid-cols-3 gap-4">
                        {flightDetails.photos.map((photo, index) => (
                            <img key={index} src={photo.url} alt={`Flight Photo ${index + 1}`} className="w-full rounded-lg" />
                        ))}
                    </div>
                </div>

                <div>
                    <h2 className="text-xl font-medium">Documents</h2>
                    <ul className="space-y-2">
                        {flightDetails.documents.map((doc, index) => (
                            <li key={index} className="bg-gray-100 p-3 rounded-md">
                                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-500">
                                    {doc.name}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                <div>
                    <h2 className="text-xl font-medium">Engineer Comments</h2>
                    <ul className="space-y-2">
                        {flightDetails.comments.map((comment, index) => (
                            <li key={index} className="bg-gray-100 p-3 rounded-md">
                                <strong>{comment.author}:</strong> {comment.text}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default FlightDetails;
