import { environment } from '../../../environments/environment.production';

export const API_BASE_URL = environment.apiUrl;

export const API_ENDPOINTS = {
  auth: `${API_BASE_URL}/api/auth`,
  users: `${API_BASE_URL}/api/users`,
  areas: `${API_BASE_URL}/api/areas`,
  news: `${API_BASE_URL}/api/news`,
  comments: `${API_BASE_URL}/api/news`,
  documents: `${API_BASE_URL}/api/documents`,
  fixedAssets: `${API_BASE_URL}/api/fixed-assets`,
  birthdays: `${API_BASE_URL}/api/users/birthdays`,
  certificates: `${API_BASE_URL}/api/academy/certificates`,
  academy: `${API_BASE_URL}/api/academy`,
  requirements: `${API_BASE_URL}/api/requirements`,
  reservations: `${API_BASE_URL}/api/reservations`,
  absences: `${API_BASE_URL}/api/absences`,
  absenceTypes: `${API_BASE_URL}/api/absence-types`,
  absenceApproverAssignments: `${API_BASE_URL}/api/absence-approver-assignments`
};
