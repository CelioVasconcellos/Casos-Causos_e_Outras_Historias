import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import './index.css'

const apiBaseUrl = import.meta.env.VITE_API_URL || ''
axios.defaults.baseURL = apiBaseUrl
axios.defaults.withCredentials = true

axios.interceptors.response.use(
  response => response,
  error => {
    const authHeader = error.config?.headers?.Authorization || error.config?.headers?.authorization
    if (error.response?.status === 401 && authHeader) {
      const requestToken = authHeader.replace(/^Bearer\s+/i, '')
      const expiredAdminSession = sessionStorage.getItem('admin_token') === requestToken
      sessionStorage.removeItem(expiredAdminSession ? 'admin_token' : 'token')
      sessionStorage.setItem('auth_notice', 'Sua sessão expirou. Entre novamente para continuar.')
      window.location.href = expiredAdminSession ? '/admin/login' : '/login'
    }
    return Promise.reject(error)
  },
)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
