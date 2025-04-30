// services/api.ts
import axios from 'axios';

const api = axios.create({
    baseURL: 'http://127.0.0.1:5000/api',
});

const getToken = () => localStorage.getItem('token');

api.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Временно отключаем перехватчик ответа
// api.interceptors.response.use(
//     (response) => response,
//     (error) => {
//         if (error.response?.status === 401 || error.response?.status === 422) {
//             const protectedEndpoints = ['/trials', '/dashboard', '/flights'];
//             const requestUrl = error.config.url || '';
//             if (protectedEndpoints.some((endpoint) => requestUrl.includes(endpoint))) {
//                 localStorage.removeItem('token');
//                 window.location.href = '/login';
//             }
//         }
//         return Promise.reject(error);
//     }
// );

export const getFlightDetails = async (id: string, isTrial: boolean = false) => {
    const token = localStorage.getItem('token');
    if (!token) {
        throw new Error('No authorization token found');
    }
    const endpoint = isTrial ? `/trials/${id}/flight-data` : `/flights/${id}`;
    return api.get(endpoint, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
};

export default api;