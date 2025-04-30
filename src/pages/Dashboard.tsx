import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useLocation } from 'react-router-dom';
import { Line } from 'react-chartjs-2';
import { MapContainer, TileLayer, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { LatLng } from 'leaflet';
import zoomPlugin from 'chartjs-plugin-zoom';
import {
    Chart as ChartJS,
    LineElement,
    PointElement,
    LinearScale,
    TimeScale,
    Title,
    Tooltip,
    Legend,
    ChartEvent,
    InteractionItem,
} from 'chart.js';
import 'chartjs-adapter-date-fns';
import { useAuth } from '../context/AuthContext';
import api, { getFlightDetails } from '../services/api';
import FileManager from '../components/FileManager';
import debounce from 'lodash/debounce';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

ChartJS.register(LineElement, PointElement, LinearScale, TimeScale, Title, Tooltip, Legend, zoomPlugin);

interface FlightDataPoint {
    Time: number;
    alt: number;
    speed: number;
    gx: number;
    gy: number;
    gz: number;
    angratex: number;
    angratey: number;
    angratez: number;
    lat: number;
    long: number;
}

const Dashboard: React.FC = () => {
    const { token } = useAuth();
    const [flightData, setFlightData] = useState<FlightDataPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [ws, setWs] = useState<WebSocket | null>(null);
    const [users, setUsers] = useState<string[]>([]);
    const [chatMessages, setChatMessages] = useState<{ userId: string; message: string }[]>(() => {
        const savedMessages = localStorage.getItem('chatMessages');
        return savedMessages ? JSON.parse(savedMessages) : [];
    });
    const [chatInput, setChatInput] = useState('');
    const [typingUsers, setTypingUsers] = useState<string[]>([]);
    const [newMessageCount, setNewMessageCount] = useState(0);
    const [isChatVisible, setIsChatVisible] = useState(true);
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [backupProgress, setBackupProgress] = useState<number>(0);
    const [isBackupInProgress, setIsBackupInProgress] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const chartRefs = useRef<{ [key: string]: ChartJS | undefined }>({
        altitude: undefined,
        speed: undefined,
        gyro: undefined,
        angRate: undefined,
    });
    const { id } = useParams<{ id: string }>();
    const [searchParams] = useSearchParams();
    const location = useLocation();
    const shareToken = searchParams.get('share');
    const isTrial = location.pathname.startsWith('/trials');

    useEffect(() => {
        console.log(`Dashboard: Fetching data for ${isTrial ? 'trial' : 'flight'} ID:`, id);
        const fetchFlightData = async () => {
            if (!id) {
                setError('ID not provided');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                if (!token) {
                    throw new Error('No authorization token available');
                }
                const response = await getFlightDetails(id, isTrial);
                console.log('Flight data response:', response.data);
                if (!Array.isArray(response.data)) {
                    throw new Error('Invalid flight data format');
                }
                const initialData = response.data.slice(0, 100);
                setFlightData(initialData);
                setTimeout(() => {
                    const decimatedData = response.data.filter(
                        (_point: FlightDataPoint, index: number) => index % 10 === 0
                    );
                    setFlightData(decimatedData);
                }, 500);
                setError(null);
            } catch (err: any) {
                setError(err.response?.data?.error || err.message || 'Failed to load flight data');
                console.error('Fetch flight data error:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchFlightData();
    }, [id, token, isTrial]);

    useEffect(() => {
        if (!token || !id) return;

        const connectWebSocket = () => {
            const wsUrl = isTrial
                ? `ws://localhost:8080?token=${token}&trialId=${id}`
                : `ws://localhost:8080?token=${token}&flightId=${id}`;
            const websocket = new WebSocket(wsUrl);
            setWs(websocket);

            websocket.onopen = () => {
                console.log('Connected to WebSocket server');
                websocket.send(JSON.stringify({ type: 'getUserList' }));
            };

            websocket.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log('WebSocket message:', data);
                if (data.type === 'userList') {
                    setUsers(data.users);
                } else if (data.type === 'userJoined') {
                    setUsers((prev) => [...prev, data.userId].filter((v, i, a) => a.indexOf(v) === i));
                } else if (data.type === 'userLeft') {
                    setUsers((prev) => prev.filter((user) => user !== data.userId));
                    setTypingUsers((prev) => prev.filter((user) => user !== data.userId));
                } else if (data.type === 'chatMessage') {
                    setChatMessages((prev) => [...prev, { userId: data.userId, message: data.message }]);
                    if (!isChatVisible || !chatContainerRef.current?.matches(':hover')) {
                        setNewMessageCount((prev) => prev + 1);
                        const audio = new Audio('https://www.soundjay.com/buttons/beep-01a.mp3');
                        audio.play().catch((err) => console.log('Audio play failed:', err));
                    }
                    if (chatContainerRef.current) {
                        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
                    }
                } else if (data.type === 'zoomUpdate') {
                    handleZoomUpdate(data.chartId, data.min, data.max);
                } else if (data.type === 'typing') {
                    if (data.isTyping) {
                        setTypingUsers((prev) => [...prev, data.userId].filter((v, i, a) => a.indexOf(v) === i));
                    } else {
                        setTypingUsers((prev) => prev.filter((user) => user !== data.userId));
                    }
                }
            };

            websocket.onerror = (error) => {
                console.error('WebSocket error:', error);
            };

            websocket.onclose = (event) => {
                console.log('Disconnected from WebSocket server', event.code, event.reason);
                setWs(null);
                if (event.code !== 1000) {
                    setTimeout(connectWebSocket, 1000);
                }
            };
        };

        connectWebSocket();

        return () => {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.close();
            }
        };
    }, [token, id, isTrial]);

    useEffect(() => {
        localStorage.setItem('chatMessages', JSON.stringify(chatMessages));
    }, [chatMessages]);

    useEffect(() => {
        const validateShareToken = async () => {
            if (shareToken) {
                try {
                    const response = await api.get(`/share/${shareToken}`);
                    if (response.data.trial_id !== id) {
                        setError('Invalid share link for this trial');
                    }
                } catch (err: any) {
                    setError('Failed to validate share link: ' + (err.response?.data?.error || 'Unknown error'));
                }
            }
        };
        validateShareToken();
    }, [shareToken, id]);

    const sendWebSocketMessage = (message: object) => {
        if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
        } else {
            console.warn('WebSocket is not open');
        }
    };

    const handleTyping = () => {
        sendWebSocketMessage({ type: 'typing', isTyping: true });
    };

    const stopTyping = () => {
        sendWebSocketMessage({ type: 'typing', isTyping: false });
    };

    const sendChatMessage = () => {
        if (chatInput.trim()) {
            sendWebSocketMessage({ type: 'chatMessage', message: chatInput });
            setChatInput('');
            stopTyping();
        }
    };

    const handleZoomChange = debounce((chartId: string, chart: ChartJS) => {
        const { min, max } = chart.options.scales!.x!;
        sendWebSocketMessage({ type: 'zoomUpdate', chartId, min, max });
    }, 500);

    const handleZoomUpdate = debounce((chartId: string, min: number, max: number) => {
        const chart = chartRefs.current[chartId];
        if (chart) {
            chart.options.scales!.x!.min = min;
            chart.options.scales!.x!.max = max;
            chart.update();
        }
    }, 500);

    const handleChatFocus = () => {
        setNewMessageCount(0);
    };

    const generateShareLink = async () => {
        if (!id) return;
        try {
            const response = await api.post(`/trials/${id}/share`);
            setShareLink(response.data.share_url);
        } catch (err) {
            console.error('Failed to generate share link:', err);
        }
    };

    const createBackup = async () => {
        if (isBackupInProgress) return;
        setIsBackupInProgress(true);
        setBackupProgress(0);

        try {
            const zip = new JSZip();

            const trialsResponse = await api.get('/trials');
            const trials = trialsResponse.data;
            const totalSteps = trials.length * 2 + 1;
            let currentStep = 0;

            for (const trial of trials) {
                const trialFolder = zip.folder(trial.id)!;
                trialFolder.file('trial.json', JSON.stringify(trial, null, 2));

                for (const flight of trial.flights) {
                    const flightResponse = await api.get(`/flights/${flight.id}`);
                    trialFolder.file(`${flight.id}.json`, JSON.stringify(flightResponse.data, null, 2));
                }

                currentStep++;
                setBackupProgress((currentStep / totalSteps) * 100);
            }

            for (const trial of trials) {
                const filesResponse = await api.get(`/trials/${trial.id}/files`);
                const files = filesResponse.data;
                const filesFolder = zip.folder(`${trial.id}/files`)!;

                for (const file of files) {
                    try {
                        const fileResponse = await fetch(file.url, {
                            headers: { Authorization: `Bearer ${token}` },
                        });
                        if (!fileResponse.ok) {
                            console.warn(`Failed to fetch file ${file.name}: ${fileResponse.statusText}`);
                            continue;
                        }
                        const fileBlob = await fileResponse.blob();
                        filesFolder.file(file.name, fileBlob);
                    } catch (err) {
                        console.error(`Error fetching file ${file.name}:`, err);
                    }
                }

                currentStep++;
                setBackupProgress((currentStep / totalSteps) * 100);
            }

            zip.file('chatMessages.json', JSON.stringify(chatMessages, null, 2));
            currentStep++;
            setBackupProgress((currentStep / totalSteps) * 100);

            const content = await zip.generateAsync({ type: 'blob' });
            saveAs(content, `flight_backup_${new Date().toISOString().slice(0, 10)}.zip`);
        } catch (err) {
            console.error('Backup creation failed:', err);
            setError('Не удалось создать резервную копию');
        } finally {
            setIsBackupInProgress(false);
            setBackupProgress(0);
        }
    };

    if (loading) return <div>Загрузка данных...</div>;
    if (error) return <div>Ошибка: {error}</div>;
    if (!flightData.length) return <div>Данные отсутствуют</div>;

    const times = flightData.map((d) => d.Time);
    const altitudes = flightData.map((d) => d.alt);
    const speeds = flightData.map((d) => d.speed);
    const gx = flightData.map((d) => d.gx);
    const gy = flightData.map((d) => d.gy);
    const gz = flightData.map((d) => d.gz);
    const angratex = flightData.map((d) => d.angratex);
    const angratey = flightData.map((d) => d.angratey);
    const angratez = flightData.map((d) => d.angratez);
    const positions: LatLng[] = flightData.map((d) => new LatLng(d.lat, d.long));

    const altitudeData = {
        labels: times,
        datasets: [{ label: 'Altitude', data: altitudes, borderColor: 'purple', fill: false, pointRadius: 0 }],
    };

    const speedData = {
        labels: times,
        datasets: [{ label: 'Speed', data: speeds, borderColor: 'purple', fill: false, pointRadius: 0 }],
    };

    const gyroData = {
        labels: times,
        datasets: [
            { label: 'Gx', data: gx, borderColor: 'blue', fill: false, pointRadius: 0 },
            { label: 'Gy', data: gy, borderColor: 'red', fill: false, pointRadius: 0 },
            { label: 'Gz', data: gz, borderColor: 'green', fill: false, pointRadius: 0 },
        ],
    };

    const angRateData = {
        labels: times,
        datasets: [
            { label: 'AngRateX', data: angratex, borderColor: 'blue', fill: false, pointRadius: 0 },
            { label: 'AngRateY', data: angratey, borderColor: 'red', fill: false, pointRadius: 0 },
            { label: 'AngRateZ', data: angratez, borderColor: 'green', fill: false, pointRadius: 0 },
        ],
    };

    const chartOptions = {
        scales: {
            x: {
                type: 'linear' as const,
                title: { display: true, text: 'Time (s)' },
                min: 0,
                max: Math.max(...times),
                ticks: { stepSize: 10 },
            },
            y: { title: { display: true, text: 'Value' }, ticks: { stepSize: 50 } },
        },
        plugins: {
            zoom: {
                pan: { enabled: true, mode: 'x' as const },
                zoom: {
                    wheel: { enabled: true },
                    pinch: { enabled: true },
                    mode: 'x' as const,
                    onZoomComplete: ({ chart }: { chart: ChartJS }) => {
                        const chartId = chart.canvas.id;
                        handleZoomChange(chartId, chart);
                    },
                },
                limits: { x: { min: 0, max: Math.max(...times) } },
            },
        },
        onClick: (event: ChartEvent, _elements: InteractionItem[], chart: ChartJS) => {
            if (event.native && (event.native as MouseEvent).detail === 2) {
                chart.resetZoom();
            }
        },
        animation: { duration: 0 },
    };

    return (
        <div className="p-4">
            <div className="flex justify-between items-center mb-4">
                <h1 className="text-2xl font-bold">{isTrial ? `Дашборд испытания: ${id}` : `Дашборд полёта: ${id}`}</h1>
                <div className="flex gap-2">
                    <button
                        onClick={generateShareLink}
                        className="p-2 bg-green-500 text-white rounded hover:bg-green-600"
                    >
                        Поделиться
                    </button>
                    <button
                        onClick={createBackup}
                        disabled={isBackupInProgress}
                        className={`p-2 text-white rounded ${
                            isBackupInProgress ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
                        }`}
                    >
                        {isBackupInProgress ? 'Создание...' : 'Создать резервную копию'}
                    </button>
                </div>
            </div>
            {shareLink && (
                <div className="mb-4">
                    <p className="text-sm">Поделитесь этой ссылкой:</p>
                    <a href={shareLink} className="text-blue-500 break-all">{shareLink}</a>
                </div>
            )}
            {isBackupInProgress && (
                <div className="mb-4">
                    <p className="text-sm">Создание резервной копии: {backupProgress.toFixed(1)}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div
                            className="bg-blue-600 h-2.5 rounded-full"
                            style={{ width: `${backupProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            <div className="mb-4 flex gap-4">
                <div className="w-1/4 p-4 border rounded">
                    <h3 className="text-lg font-bold mb-2">Подключённые пользователи</h3>
                    {users.length > 0 ? (
                        <ul>
                            {users.map((user) => (
                                <li key={user} className="text-sm text-gray-700">
                                    Пользователь {user}
                                    {typingUsers.includes(user) && <span className="text-gray-500"> (печатает)</span>}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-gray-500">Нет подключённых пользователей</p>
                    )}
                </div>

                <div className="w-3/4 p-4 border rounded">
                    <div className="flex justify-between items-center mb-2">
                        <h3 className="text-lg font-bold">Чат</h3>
                        <button
                            onClick={() => setIsChatVisible(!isChatVisible)}
                            className="p-1 bg-gray-200 rounded"
                        >
                            {isChatVisible ? 'Скрыть' : `Показать (${newMessageCount} новых)`}
                        </button>
                    </div>
                    {isChatVisible && (
                        <>
                            <div
                                className="h-40 overflow-y-auto mb-2 p-2 border"
                                ref={chatContainerRef}
                                onMouseEnter={handleChatFocus}
                            >
                                {chatMessages.map((msg, index) => (
                                    <div
                                        key={index}
                                        className={`text-sm ${
                                            index >= chatMessages.length - newMessageCount ? 'bg-yellow-100' : ''
                                        } p-1 rounded`}
                                    >
                                        <strong>Пользователь {msg.userId}:</strong> {msg.message}
                                    </div>
                                ))}
                            </div>
                            {typingUsers.length > 0 && (
                                <div className="text-sm text-gray-500 mb-2">
                                    {typingUsers.length === 1
                                        ? `Пользователь ${typingUsers[0]} печатает...`
                                        : `${typingUsers.length} пользователей печатают...`}
                                </div>
                            )}
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => {
                                        setChatInput(e.target.value);
                                        handleTyping();
                                    }}
                                    onKeyPress={(e) => e.key === 'Enter' && sendChatMessage()}
                                    onBlur={stopTyping}
                                    className="flex-1 p-2 border rounded"
                                    placeholder="Введите сообщение..."
                                />
                                <button
                                    onClick={sendChatMessage}
                                    className="p-2 bg-blue-500 text-white rounded"
                                >
                                    Отправить
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="mb-4">
                <FileManager trialId={id!} />
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                    <Line
                        id="altitude"
                        ref={(ref) => (chartRefs.current.altitude = ref || undefined)}
                        data={altitudeData}
                        options={{
                            ...chartOptions,
                            scales: {
                                ...chartOptions.scales,
                                y: { title: { display: true, text: 'Altitude (m)' }, ticks: { stepSize: 100 } },
                            },
                        }}
                    />
                </div>

                <div className="col-span-1">
                    <MapContainer
                        center={positions.length > 0 ? positions[0] : new LatLng(37.7749, -122.4194)}
                        zoom={10}
                        style={{ height: '300px', width: '100%' }}
                    >
                        <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                        />
                        <Polyline positions={positions} color="blue" />
                    </MapContainer>
                </div>

                <div className="col-span-2">
                    <Line
                        id="speed"
                        ref={(ref) => (chartRefs.current.speed = ref || undefined)}
                        data={speedData}
                        options={{
                            ...chartOptions,
                            scales: {
                                ...chartOptions.scales,
                                y: { title: { display: true, text: 'Speed (m/s)' }, ticks: { stepSize: 20 } },
                            },
                        }}
                    />
                </div>

                <div className="col-span-1">
                    <Line
                        id="gyro"
                        ref={(ref) => (chartRefs.current.gyro = ref || undefined)}
                        data={gyroData}
                        options={{
                            ...chartOptions,
                            scales: {
                                ...chartOptions.scales,
                                y: { title: { display: true, text: 'Gyro (rad/s)' }, ticks: { stepSize: 0.2 } },
                            },
                        }}
                    />
                </div>

                <div className="col-span-1">
                    <Line
                        id="angRate"
                        ref={(ref) => (chartRefs.current.angRate = ref || undefined)}
                        data={angRateData}
                        options={{
                            ...chartOptions,
                            scales: {
                                ...chartOptions.scales,
                                y: { title: { display: true, text: 'AngRate (rad/s)' }, ticks: { stepSize: 0.5 } },
                            },
                        }}
                    />
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
