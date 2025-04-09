import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'react-loading-skeleton/dist/skeleton.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Coverage Check Order',
  description: 'Collect and manage building information and site visits',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen bg-gray-50">
          {children}
          <ToastContainer position="top-right" autoClose={5000} hideProgressBar={false} />
        </main>
      </body>
    </html>
  );
}
