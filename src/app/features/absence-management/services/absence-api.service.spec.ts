import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { authInterceptor } from '../../../core/interceptors/auth.interceptor';
import { SessionService } from '../../../core/services/session.service';
import { API_ENDPOINTS } from '../../../core/constants/api.constants';
import { AbsenceApiService } from './absence-api.service';
describe('AbsenceApiService', () => {
  let api: AbsenceApiService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: SessionService, useValue: { getToken: () => 'test-token' } },
      ],
    });
    api = TestBed.inject(AbsenceApiService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('loads personal requests using the relative API and existing authentication interceptor', () => {
    api.getMyRequests().subscribe();
    const req = http.expectOne('/api/absences/my');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Authorization')).toBe('Bearer test-token');
    req.flush([]);
  });
  it('loads assigned pending approvals', () => {
    api.getPendingApprovals().subscribe();
    const req = http.expectOne(`${API_ENDPOINTS.absences}/pending`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });
  it('posts only the backend creation contract', () => {
    const input = {
      type: 'PERSONAL',
      startDate: '2026-10-01',
      endDate: '2026-10-01',
      startTime: '09:15',
      endTime: '10:30',
      reason: 'Appointment',
    };
    api.createRequest(input).subscribe();
    const req = http.expectOne(API_ENDPOINTS.absences);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(input);
    req.flush({});
  });
  it('posts multipart data when a support file is supplied', () => {
    const input = {
      type: 'PERSONAL',
      startDate: '2026-10-01',
      endDate: '2026-10-01',
      startTime: '09:15',
      endTime: '10:30',
      reason: 'Appointment',
    };

    const file = new File(
      ['image-content'],
      'soporte.png',
      { type: 'image/png' }
    );

    api.createRequest(input, file).subscribe();

    const req =
      http.expectOne(API_ENDPOINTS.absences);

    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBeTrue();

    const body =
      req.request.body as FormData;

    expect(body.get('file')).toBe(file);

    const data =
      body.get('data');

    expect(data instanceof Blob).toBeTrue();
    expect((data as Blob).type).toBe('application/json');

    req.flush({});
  });

  it('downloads absence support as a blob and encodes the id', () => {
    api.getSupport('id/part').subscribe();

    const req =
      http.expectOne(
        `${API_ENDPOINTS.absences}/id%2Fpart/support`
      );

    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');

    req.flush(
      new Blob(
        ['image-content'],
        { type: 'image/png' }
      )
    );
  });

  it('approves with PUT and an empty comment by default', () => {
    api.approveRequest('request-1').subscribe();
    const req = http.expectOne(`${API_ENDPOINTS.absences}/request-1/approve`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ comment: '' });
    req.flush({});
  });
  it('rejects with PUT and the supplied comment', () => {
    api.rejectRequest('request-1', 'Reschedule').subscribe();
    const req = http.expectOne(`${API_ENDPOINTS.absences}/request-1/reject`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ comment: 'Reschedule' });
    req.flush({});
  });
  it('encodes request identifiers as a path segment', () => {
    api.approveRequest('id/part').subscribe();
    http.expectOne(`${API_ENDPOINTS.absences}/id%2Fpart/approve`).flush({});
  });
});
