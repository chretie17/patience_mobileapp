import axios from 'axios';

const API_BASE_URL = 'http://192.168.1.68:3000/api'; // Correct local network IP and port

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
