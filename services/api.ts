import axios from 'axios';

const api = axios.create({
  baseURL: 'https://apis.27012610.xyz',
  timeout: 10000
});

export default api;