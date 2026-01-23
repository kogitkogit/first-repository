import axios from "axios";

const baseURL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000/api";

const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

// 요청마다 localStorage 토큰 자동 첨부
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// NOTE: BASE_ITEM 같은 DB 초기값은 패널 컴포넌트에서 처리합니다.
