import BuildingForm from '@/components/BuildingForm';
import Navbar from '@/components/Navbar';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <div className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          <header className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800">Building Information System</h1>
            <p className="text-gray-600 mt-2">
              Record building information and site visits
            </p>
          </header>
          
          <BuildingForm />
        </div>
      </div>
    </div>
  );
}
