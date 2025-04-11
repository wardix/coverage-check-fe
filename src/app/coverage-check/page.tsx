import CoverageCheckForm from '@/components/CoverageCheckForm';
import Navbar from '@/components/Navbar';

export default function CoverageCheckPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
              Check Service Coverage
            </h1>
            <p className="mt-3 text-xl text-gray-500 sm:mt-4">
              Find out if our services are available at your location.
            </p>
          </div>
          
          <div className="mt-10">
            <CoverageCheckForm />
          </div>
          
          <div className="mt-12 bg-white shadow overflow-hidden rounded-lg divide-y divide-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h2 className="text-lg font-medium text-gray-900">Frequently Asked Questions</h2>
            </div>
            <div className="px-4 py-5 sm:p-6 space-y-6">
              <div>
                <h3 className="text-md font-medium text-gray-900">How long does the coverage check take?</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Our automated system provides instant results in most cases. For complex buildings or locations, 
                  a manual check may be required, which typically takes 1-2 business days.
                </p>
              </div>
              <div>
                <h3 className="text-md font-medium text-gray-900">What if my location is not covered?</h3>
                <p className="mt-1 text-sm text-gray-500">
                  If service is not currently available at your location, we&apos;ll add your information to our 
                  waitlist. You&apos;ll be notified as soon as coverage becomes available.
                </p>
              </div>
              <div>
                <h3 className="text-md font-medium text-gray-900">What information do I need to provide?</h3>
                <p className="mt-1 text-sm text-gray-500">
                  For an accurate coverage check, we need your complete address, zip/postal code, and 
                  building type. Contact information is required so we can follow up with you.
                </p>
              </div>
              <div>
                <h3 className="text-md font-medium text-gray-900">How is my data protected?</h3>
                <p className="mt-1 text-sm text-gray-500">
                  We take data privacy seriously. Your information is securely stored and only used for 
                  the purpose of checking service availability and contacting you about our services.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
