import { useAuth } from '../../context/useAuth'
import { hasPermission as checkPermission, hasRole as checkRole } from '../../auth/permissions'

/**
 * Component guard that conditionally renders children based on permissions or roles.
 *
 * Usage:
 * <RequirePermission permission="DELIVERY_ASSIGN" fallback={<span>No access</span>}>
 *   <AssignButton />
 * </RequirePermission>
 *
 * <RequireRole roles={['ADMIN', 'DISPATCHER']}>
 *   <DispatchPanel />
 * </RequireRole>
 */
export function RequirePermission({ permission, permissions = [], fallback = null, children }) {
  const { user } = useAuth()

  if (!user) return fallback

  if (permission && !checkPermission(user, permission)) {
    return fallback
  }

  if (permissions.length > 0) {
    const hasAny = permissions.some((p) => checkPermission(user, p))
    if (!hasAny) return fallback
  }

  return <>{children}</>
}

export function RequireRole({ roles = [], fallback = null, children }) {
  const { user } = useAuth()

  if (!user || !user.role) return fallback

  if (roles.length > 0 && !checkRole(user, ...roles)) {
    return fallback
  }

  return <>{children}</>
}
