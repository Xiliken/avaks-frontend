import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';

interface AuthContextType {
    token: string | null;
    login: (email: string, password: string) => Promise<void>;
    register: (email: string, password: string) => Promise<void>;
    logout: () => void;
    validateToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
    const navigate = useNavigate();

    // Стабильная функция logout с использованием useCallback
    const logout = useCallback(() => {
        setToken(null);
        localStorage.removeItem('token');
        toast.info('Сессия истекла, перенаправляем на страницу входа...');
        navigate('/login', { replace: true });
    }, [navigate]);

    // Обновление токена при изменении в localStorage
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === 'token') {
                setToken(e.newValue);
                if (!e.newValue) {
                    logout();
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [logout]);

    // Логин
    const login = async (email: string, password: string) => {
        try {
            const response = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка входа');
            }

            const data = await response.json();
            setToken(data.access_token);
            localStorage.setItem('token', data.access_token);
            toast.success('Успешный вход!');
            navigate('/', { replace: true });
        } catch (error: any) {
            toast.error(error.message);
            throw error;
        }
    };

    // Регистрация
    const register = async (email: string, password: string) => {
        try {
            const response = await fetch('http://localhost:5000/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Ошибка регистрации');
            }

            toast.success('Регистрация успешна! Пожалуйста, войдите.');
        } catch (error: any) {
            toast.error(error.message);
            throw error;
        }
    };

    // Проверка валидности токена
    const validateToken = useCallback(async (): Promise<boolean> => {
        if (!token) {
            logout();
            return false;
        }

        try {
            const response = await fetch('http://localhost:5000/api/dashboard', {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!response.ok) {
                if (response.status === 401) {
                    logout();
                }
                return false;
            }
            return true;
        } catch (error) {
            console.error('Token validation failed:', error);
            logout();
            return false;
        }
    }, [token, logout]);

    // Интерцептор для fetch
    useEffect(() => {
        const originalFetch = window.fetch;

        window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
            // Добавляем токен в заголовки, если он есть и не указан явно
            const headers = new Headers(init?.headers || {});
            if (token && !headers.has('Authorization')) {
                headers.set('Authorization', `Bearer ${token}`);
            }

            try {
                const response = await originalFetch(input, {
                    ...init,
                    headers,
                });

                if (response.status === 401) {
                    console.log('Fetch intercepted 401, logging out');
                    logout();
                    throw new Error('Unauthorized - session expired');
                }

                return response;
            } catch (error) {
                console.error('Fetch error:', error);
                throw error;
            }
        };

        return () => {
            window.fetch = originalFetch;
        };
    }, [token, logout]);

    return (
        <AuthContext.Provider value={{ token, login, register, logout, validateToken }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};