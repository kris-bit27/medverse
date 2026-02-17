import { Navigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
export default function() { return <Navigate to={createPageUrl('MedSearch')} replace />; }
