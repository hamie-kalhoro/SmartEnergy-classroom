import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '',
});

// Interceptor to add JWT token to headers
api.interceptors.request.use((config) => {
    let user = null;
    try {
        const saved = localStorage.getItem('user');
        user = saved ? JSON.parse(saved) : null;
    } catch (e) {
        console.error("API Interceptor: Failed to parse user", e);
    }
    
    if (user && user.token) {
        config.headers.Authorization = `Bearer ${user.token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

// Interceptor to handle expired tokens
api.interceptors.response.use(
    (response) => response,
    (error) => {
        // A failed login is not an expired session: let the login page show the reason.
        if (error.response && error.response.status === 401 && error.config?.url !== '/api/login') {
            localStorage.removeItem('user');
            window.location.href = '/login?expired=true';
        }
        return Promise.reject(error);
    }
);

export default api;
