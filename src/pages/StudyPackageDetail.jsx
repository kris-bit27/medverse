import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function StudyPackageDetail() {
  return <Navigate to={createPageUrl('StudyPackages')} replace />;
}
