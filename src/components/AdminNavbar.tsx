'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function AdminNavbar() {
  const pathname = usePathname();
  
  // Define navigation items
  const navItems = [
    { name: 'Dashboard', href: '/admin' },
    { name: 'Settings', href: '/admin/settings' }
  ];
  
  // Check if the nav item is active
  const isActive = (path: string) => {
    if (path === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(path);
  };
  
  return (
    <nav className="bg-white shadow-md mb-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/admin" className="text-xl font-bold text-blue-600">
                Admin Panel
              </Link>
            </div>
            <div className="ml-10 flex items-center space-x-4">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`px-3 py-2 rounded-md text-sm font-medium ${
                    isActive(item.href)
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="flex items-center">
            <Link
              href="/"
              className="ml-4 px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-100"
            >
              Back to Frontend
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
