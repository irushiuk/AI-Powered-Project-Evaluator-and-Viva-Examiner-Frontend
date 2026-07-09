import '../styles/globals.css'
import { Poppins } from 'next/font/google'
import AuthProvider from '@/context/AuthContext'
import { Toaster } from '@/components/ui/sonner'
import { getServerUser } from '@/services/serverApi'

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
})

export const metadata = {
  title: 'VivaSense',
  description: 'VivaSense — AI-assisted project evaluations and viva management',
  icons: {
    icon: '/images/meeting.png',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Resolve the session on the server so the client knows the user at paint
  // time — no "Checking session..." flash on initial load.
  const initialUser = await getServerUser()

  return (
    <html lang="en">
      <body className={poppins.className}>
        <AuthProvider initialUser={initialUser}>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
