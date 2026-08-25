import AdminDashboard from '../components/AdminDashboard'
import { Navigate } from 'react-router-dom'

export default function AdminPage() {
  if (!localStorage.getItem('admin_token')) {
    return <Navigate to="/admin/login" replace />
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <AdminDashboard />
    </div>
  )
}
