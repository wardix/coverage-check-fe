import { Suspense } from 'react';
import SubmissionDetail, { SubmissionDetailSkeleton } from '@/components/SubmissionDetail';

// useSearchParams needs a Suspense boundary for static export.
export default function SubmissionDetailPage() {
  return (
    <Suspense fallback={<SubmissionDetailSkeleton />}>
      <SubmissionDetail />
    </Suspense>
  );
}
