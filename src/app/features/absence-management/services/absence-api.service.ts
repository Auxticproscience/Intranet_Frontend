import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { API_ENDPOINTS } from '../../../core/constants/api.constants';

import {
  AbsenceApproverUser,
  AbsenceApproverAssignment,
  AbsenceCreateRequest,
  AbsenceResponse,
  AbsenceTypeResponse,
} from '../models/absence-api';

export interface AbsenceCapabilities {
  canApprove: boolean;
  canViewIndicators: boolean;
  canManageAbsenceTypes: boolean;
}

@Injectable({ providedIn: 'root' })
export class AbsenceApiService {

  private readonly http = inject(HttpClient);

  private readonly url =
    API_ENDPOINTS.absences;

  private readonly typesUrl =
    API_ENDPOINTS.absenceTypes;

  getApproverUsers() {
    return this.http.get<AbsenceApproverUser[]>(`${API_ENDPOINTS.absenceApproverAssignments}/users`);
  }

  getApproverAssignments() {
    return this.http.get<AbsenceApproverAssignment[]>(API_ENDPOINTS.absenceApproverAssignments);
  }

  assignApprover(employeeId: string, approverId: string) {
    return this.http.put<AbsenceApproverAssignment>(
      `${API_ENDPOINTS.absenceApproverAssignments}/${encodeURIComponent(employeeId)}`,
      { approverId },
    );
  }

  deactivateApproverAssignment(employeeId: string) {
    return this.http.put<AbsenceApproverAssignment>(
      `${API_ENDPOINTS.absenceApproverAssignments}/${encodeURIComponent(employeeId)}/deactivate`, {},
    );
  }

  getMyRequests() {
    return this.http.get<AbsenceResponse[]>(
      `${this.url}/my`
    );
  }

  getPendingApprovals() {
    return this.http.get<AbsenceResponse[]>(
      `${this.url}/pending`
    );
  }

  getReporting() {
    return this.http.get<AbsenceResponse[]>(
      `${this.url}/reporting`
    );
  }

  getCapabilities() {
    return this.http.get<AbsenceCapabilities>(
      `${this.url}/capabilities`
    );
  }

  getActiveTypes() {
    return this.http.get<AbsenceTypeResponse[]>(
      this.typesUrl
    );
  }

  getAllTypes() {
    return this.http.get<AbsenceTypeResponse[]>(
      `${this.typesUrl}/admin`
    );
  }

  createType(
    request: {
      name: string;
      description?: string | null;
      active?: boolean;
    }
  ) {
    return this.http.post<AbsenceTypeResponse>(
      this.typesUrl,
      request
    );
  }

  updateType(
    id: number,
    request: {
      name: string;
      description?: string | null;
      active?: boolean;
    }
  ) {
    return this.http.put<AbsenceTypeResponse>(
      `${this.typesUrl}/${id}`,
      request
    );
  }

  activateType(id: number) {
    return this.http.put<AbsenceTypeResponse>(
      `${this.typesUrl}/${id}/activate`,
      {}
    );
  }

  deactivateType(id: number) {
    return this.http.put<AbsenceTypeResponse>(
      `${this.typesUrl}/${id}/deactivate`,
      {}
    );
  }

  createRequest(
    request: AbsenceCreateRequest,
    file?: File | null
  ) {

    if (!file) {
      return this.http.post<AbsenceResponse>(
        this.url,
        request
      );
    }

    const formData =
      new FormData();

    formData.append(
      'data',
      new Blob(
        [JSON.stringify(request)],
        {
          type: 'application/json',
        }
      )
    );

    formData.append(
      'file',
      file
    );

    return this.http.post<AbsenceResponse>(
      this.url,
      formData
    );
  }

  getSupport(
    id: string
  ) {
    return this.http.get(
      `${this.url}/${encodeURIComponent(id)}/support`,
      {
        responseType: 'blob',
      }
    );
  }

  approveRequest(
    id: string,
    comment = ''
  ) {
    return this.http.put<AbsenceResponse>(
      `${this.url}/${encodeURIComponent(id)}/approve`,
      { comment }
    );
  }

  rejectRequest(
    id: string,
    comment = ''
  ) {
    return this.http.put<AbsenceResponse>(
      `${this.url}/${encodeURIComponent(id)}/reject`,
      { comment }
    );
  }
}
