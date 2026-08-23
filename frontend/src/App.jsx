import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import { AuthPage } from './pages/AuthPage'
import { CustomerPortal } from './portals/CustomerPortal'
import { DeliveryPartnerPortal } from './portals/DeliveryPartnerPortal'
import { AdminPortal } from './portals/AdminPortal'
import { DispatcherPortal } from './portals/DispatcherPortal'
import { WarehousePortal } from './portals/WarehousePortal'
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
    case 'WAREHOUSE_STAFF':
      return <WarehousePortal />
    case 'DISPATCHER':
      return <DispatcherPortal />
    case 'ADMIN':
      return <AdminPortal />
    default:
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
