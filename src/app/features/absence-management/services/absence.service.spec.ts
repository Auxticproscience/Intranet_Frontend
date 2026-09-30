import { TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AbsenceService, absenceError } from './absence.service';
import { AbsenceResponse } from '../models/absence-api';
import { durationMinutes, fullDays, summarize, toAbsenceRequest } from '../models/absence-request';
const response: AbsenceResponse = {
  id: 'r1',
  requesterId: 'u1',
  requesterName: 'Test Employee',
  approverId: 'a1',
  approverName: 'Test Approver',
  type: 'PERSONAL',
  startDate: '2026-10-01',
  endDate: '2026-10-01',
  startTime: '09:15:00',
  endTime: '10:45:00',
  reason: 'Appointment',
  supportFile: null,
  status: 'PENDING',
  createdAt: '2026-09-20T08:00:00',
  updatedAt: '2026-09-20T08:00:00',
  approvedAt: null,
  approvalComment: null,
};
describe('AbsenceService HTTP integration', () => {
  let service: AbsenceService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(AbsenceService);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('loads real requests without reading or writing mock storage', () => {
    const read = spyOn(Storage.prototype, 'getItem');
    const write = spyOn(Storage.prototype, 'setItem');
    const sub = service.getMyRequests().subscribe();
    http.expectOne('/api/absences/my').flush([response]);
    expect(read).not.toHaveBeenCalled();
    expect(write).not.toHaveBeenCalled();
    sub.unsubscribe();
  });
  it('maps identity, minute precision and request date without timezone conversion', () => {
    const mapped = toAbsenceRequest(response);
    expect(mapped.employeeName).toBe('Test Employee');
    expect(mapped.departureAt).toBe('2026-10-01T09:15');
    expect(mapped.requestDate).toBe('2026-09-20');
    expect(durationMinutes(mapped)).toBe(90);
    expect(mapped.site).toBe('');
  });
  it('maps rejected comments and decision dates', () => {
    const mapped = toAbsenceRequest({
      ...response,
      status: 'REJECTED',
      approvalComment: 'Reschedule',
      updatedAt: '2026-09-21T11:00:00',
    });
    expect(mapped.decisionComment).toBe('Reschedule');
    expect(mapped.decisionDate).toBe('2026-09-21');
  });
  it('handles full-day requests without inventing working hours', () => {
    const mapped = toAbsenceRequest({
      ...response,
      startTime: null,
      endTime: null,
      endDate: '2026-10-02',
    });
    expect(mapped.allDay).toBeTrue();
    expect(fullDays(mapped)).toBe(2);
    expect(durationMinutes(mapped)).toBe(0);
    const summary = summarize([mapped, toAbsenceRequest(response)]);
    expect(summary.fullDays).toBe(2);
    expect(summary.totalMinutes).toBe(90);
    expect(summary.averageMinutes).toBe(90);
  });
  it('shares a single request across simultaneous list subscribers', () => {
    const a = service.getMyRequests().subscribe();
    const b = service.getMyRequests().subscribe();
    http.expectOne('/api/absences/my').flush([response]);
    a.unsubscribe();
    b.unsubscribe();
  });
  it('reloads after navigation so a later session does not receive cached records', () => {
    const a = service.getMyRequests().subscribe();
    http.expectOne('/api/absences/my').flush([response]);
    a.unsubscribe();
    const b = service.getMyRequests().subscribe();
    http.expectOne('/api/absences/my').flush([]);
    b.unsubscribe();
  });
  it('creates a request and refreshes existing personal and pending subscriptions', () => {
    const a = service.getMyRequests().subscribe();
    const b = service.getPendingApprovals().subscribe();
    http.expectOne('/api/absences/my').flush([]);
    http.expectOne('/api/absences/pending').flush([]);
    service
      .createRequest({
        type: 'PERSONAL',
        startDate: '2026-10-01',
        endDate: '2026-10-01',
        startTime: null,
        endTime: null,
        reason: 'Appointment',
      })
      .subscribe((r) => expect(r.id).toBe('r1'));
    const create = http.expectOne('/api/absences');
    expect(create.request.body.requesterId).toBeUndefined();
    create.flush(response);
    http.expectOne('/api/absences/my').flush([response]);
    http.expectOne('/api/absences/pending').flush([]);
    a.unsubscribe();
    b.unsubscribe();
  });
  for (const action of ['approveRequest', 'rejectRequest'] as const) {
    it(`refreshes pending state after ${action}`, () => {
      const sub = service.getPendingApprovals().subscribe();
      http.expectOne('/api/absences/pending').flush([response]);
      service[action]('r1').subscribe();
      http
        .expectOne(`/api/absences/r1/${action === 'approveRequest' ? 'approve' : 'reject'}`)
        .flush({ ...response, status: action === 'approveRequest' ? 'APPROVED' : 'REJECTED' });
      http.expectOne('/api/absences/pending').flush([]);
      sub.unsubscribe();
    });
  }
  it('recovers a failed list request on retry', () => {
    let message = '';
    const sub = service.myState$.subscribe((state) => (message = state.error));
    http
      .expectOne('/api/absences/my')
      .flush({ message: 'Unavailable' }, { status: 500, statusText: 'Error' });
    expect(message).toBe('Unavailable');
    service.reloadMyRequests();
    http.expectOne('/api/absences/my').flush([]);
    expect(message).toBe('');
    sub.unsubscribe();
  });
  it('reports a conflicting decision and reloads pending data', () => {
    const sub = service.getPendingApprovals().subscribe();
    http.expectOne('/api/absences/pending').flush([response]);
    let message = '';
    service.approveRequest('r1').subscribe({ error: (e) => (message = e.message) });
    http.expectOne('/api/absences/r1/approve').flush({}, { status: 409, statusText: 'Conflict' });
    expect(message).toContain('ya fue procesada');
    http.expectOne('/api/absences/pending').flush([]);
    sub.unsubscribe();
  });
  it('reports backend validation and permission failures', () => {
    expect(absenceError({ status: 400, error: { errors: { reason: 'Required' } } })).toBe(
      'Required',
    );
    expect(absenceError({ status: 403 })).toContain('permiso');
    expect(absenceError({ status: 0 })).toContain('conectar');
  });
  it('calculates status counts, type breakdowns and empty averages', () => {
    const summary = summarize([
      toAbsenceRequest(response),
      toAbsenceRequest({ ...response, id: 'r2', status: 'APPROVED' }),
    ]);
    expect(summary.total).toBe(2);
    expect(summary.statuses.map((s) => s.count)).toEqual([1, 0, 1, 0, 0]);
    expect(summary.types).toEqual([{ label: 'PERSONAL', count: 2 }]);
    expect(summarize([]).averageMinutes).toBe(0);
  });
});
