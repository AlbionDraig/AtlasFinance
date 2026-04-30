// ProtectedRoute — gate de autenticación para rutas privadas.
// Se usa como elemento de una <Route> padre: si hay user en el store renderiza
// el <Outlet/> con las rutas hijas; si no, redirige a /login.
// Nota: no validamos el token aquí; del 401 se encarga el interceptor de axios.
// Esto mantiene el componente declarativo y evita race conditions en el render inicial.
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/authStore'

export default function ProtectedRoute() {
  // Subscripción granular: solo re-renderizamos cuando cambia `user`, no en cada update del store.
  const user = useAuthStore((s) => s.user)
  // `replace` evita que /login quede en el history y el botón "atrás" vuelva a la ruta protegida.
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}
