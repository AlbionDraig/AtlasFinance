// authStore.ts — estado de sesión global vía Zustand.
// Solo guardamos el objeto User (no el access token) porque:
//   • El access token vive en memoria de api/auth.ts (no es persistible por seguridad).
//   • El refresh token viaja en cookie httpOnly manejada por el backend.
// Persistimos User en localStorage para evitar parpadeo de "no autenticado" al recargar:
// si hay user persistido + cookie válida, el siguiente refresh restaura la sesión silenciosamente.
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '@/types'

interface AuthState {
  user: User | null
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      // setUser se invoca tras login y tras refresh exitoso para mantener el perfil al día.
      setUser: (user) => set({ user }),
      // logout solo limpia el estado del cliente; la revocación del token la hace el endpoint del backend.
      logout: () => set({ user: null }),
    }),
    // 'atlas-auth' es la clave en localStorage; cambiarla invalidaría todas las sesiones persistidas.
    { name: 'atlas-auth' },
  ),
)
