import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import { AuthPage } from './pages/AuthPage'
import { CustomerPortal } from './portals/CustomerPortal'
import { DeliveryPartnerPortal } from './portals/DeliveryPartnerPortal'
import { AdminPortal } from './portals/AdminPortal'
import './App.css'

function AppContent() {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) {
    return <AuthPage />
  }

  // Role-based portal routing
  switch (user.role) {
    case 'CUSTOMER':
      return <CustomerPortal />
    case 'DELIVERY_AGENT':
      return <DeliveryPartnerPortal />
    case 'ADMIN':
      return <AdminPortal />
    default:
      // Fallback for unrecognized role
      return <CustomerPortal />
  }
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}
