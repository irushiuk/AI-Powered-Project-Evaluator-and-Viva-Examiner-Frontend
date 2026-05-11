import '../styles/globals.css'
import { Poppins } from 'next/font/google'
import AuthProvider from '@/context/AuthContext'

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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
