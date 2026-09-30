import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { By } from '@angular/platform-browser';
import { NewRequestComponent } from './new-request';
import { MyRequestsComponent } from './my-requests';
import { ApprovalsComponent } from './approvals';
import { ReportsComponent } from './reports';
import { AbsenceFiltersComponent } from '../components/absence-filters';
import { AbsenceResponse } from '../models/absence-api';
const row: AbsenceResponse = {
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
function text<T>(fixture: ComponentFixture<T>): string {
  return fixture.nativeElement.textContent;
}
function click<T>(fixture: ComponentFixture<T>, selector: string) {
  (fixture.nativeElement.querySelector(selector) as HTMLButtonElement).click();
  fixture.detectChanges();
}
describe('Absence management HTTP pages', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [NewRequestComponent, MyRequestsComponent, ApprovalsComponent, ReportsComponent],
      providers: [
        provideZonelessChangeDetection(),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  describe('New request', () => {
    let fixture: ComponentFixture<NewRequestComponent>;
    beforeEach(() => {
      fixture = TestBed.createComponent(NewRequestComponent);
      fixture.detectChanges();
      http
        .expectOne('/api/users/me')
        .flush({ id: 'u1', firstName: 'Test', lastName: 'Employee', sede: 'North' });

      http
        .expectOne('/api/absence-types')
        .flush([
          {
            id: 1,
            name: 'PERSONAL',
            description: 'Permiso personal de prueba',
            active: true,
          },
        ]);

      fixture.detectChanges();
    });
    function fill() {
      fixture.componentInstance.form.setValue({
        type: 'PERSONAL',
        departureDate: '2026-10-01',
        returnDate: '2026-10-01',
        departureTime: '09:15',
        returnTime: '10:45',
        reason: 'Appointment',
      });
    }
    it('renders the real profile and server-assigned approver explanation', () => {
      const inputs: HTMLInputElement[] = Array.from(
        fixture.nativeElement.querySelectorAll('input[readonly]'),
      );
      expect(inputs.map((i) => i.value)).toContain('Test Employee');
      expect(inputs.map((i) => i.value)).toContain('Asignado por el sistema al guardar');
    });
    it('requires dates, times, type and reason', () => {
      click(fixture, 'button[type="submit"]');
      expect(fixture.componentInstance.form.invalid).toBeTrue();
      http.expectNone('/api/absences');
    });
    it('rejects invalid calendar dates and equal or reversed ranges', () => {
      fill();
      const form = fixture.componentInstance.form;
      form.patchValue({ departureDate: '2026-02-30' });
      expect(form.hasError('invalidRange')).toBeTrue();
      form.patchValue({ departureDate: '2026-10-01', returnTime: '09:15' });
      expect(form.hasError('invalidRange')).toBeTrue();
      form.patchValue({ returnTime: '08:00' });
      expect(form.hasError('invalidRange')).toBeTrue();
    });
    it('sends the creation contract and clears only after success', () => {
      fill();
      click(fixture, 'button[type="submit"]');
      const req = http.expectOne('/api/absences');
      expect(req.request.body).toEqual({
        type: 'PERSONAL',
        startDate: '2026-10-01',
        endDate: '2026-10-01',
        startTime: '09:15',
        endTime: '10:45',
        reason: 'Appointment',
      });
      expect(fixture.componentInstance.form.controls.reason.value).toBe('Appointment');
      req.flush(row);
      fixture.detectChanges();
      expect(text(fixture)).toContain('Solicitud creada');
      expect(text(fixture)).toContain('Test Approver');
      expect(fixture.componentInstance.form.controls.reason.value).toBe('');
    });
    it('requires departure and return times before submitting', () => {
      fill();

      fixture.componentInstance.form.patchValue({
        departureTime: '',
        returnTime: '',
      });

      fixture.detectChanges();

      click(fixture, 'button[type="submit"]');

      http.expectNone('/api/absences');

      expect(fixture.componentInstance.form.invalid).toBeTrue();
    });

    it('prevents duplicate posts while saving', () => {
      fill();
      fixture.componentInstance.submit();
      fixture.componentInstance.submit();
      http.expectOne('/api/absences').flush(row);
    });
    it('retains input and displays backend errors', () => {
      fill();
      click(fixture, 'button[type="submit"]');
      http
        .expectOne('/api/absences')
        .flush({ message: 'No approver configured' }, { status: 400, statusText: 'Bad Request' });
      fixture.detectChanges();
      expect(text(fixture)).toContain('No approver configured');
      expect(fixture.componentInstance.form.controls.reason.value).toBe('Appointment');
      expect(fixture.componentInstance.saving).toBeFalse();
    });
    it('rejects whitespace-only values', () => {
      fill();
      fixture.componentInstance.form.patchValue({ reason: '  ', type: '  ' });
      expect(fixture.componentInstance.form.invalid).toBeTrue();
    });
  });
  describe('My requests', () => {
    let fixture: ComponentFixture<MyRequestsComponent>;
    beforeEach(() => {
      fixture = TestBed.createComponent(MyRequestsComponent);
      fixture.detectChanges();
    });
    it('renders backend rows with duration and no unsupported cancellation action', () => {
      http.expectOne('/api/absences/my').flush([row]);
      fixture.detectChanges();
      expect(text(fixture)).toContain('1 h 30 min');
      expect(text(fixture)).toContain('Pendiente');
      expect(fixture.nativeElement.querySelector('[aria-label^="Cancelar"]')).toBeNull();
    });
    it('shows loading then an empty state', () => {
      expect(text(fixture)).toContain('Cargando');
      http.expectOne('/api/absences/my').flush([]);
      fixture.detectChanges();
      expect(text(fixture)).toContain('No hay solicitudes');
    });
    it('filters by status, date and case-insensitive search then clears', () => {
      http.expectOne('/api/absences/my').flush([row, { ...row, id: 'r2', status: 'APPROVED' }]);
      fixture.detectChanges();
      const filters = fixture.debugElement.query(By.directive(AbsenceFiltersComponent))
        .componentInstance as AbsenceFiltersComponent;
      filters.value = { status: 'PENDING', date: '2026-10-01', search: 'APPOINTMENT', site: '' };
      filters.emit();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
      filters.value.search = 'unmatched';
      filters.emit();
      fixture.detectChanges();
      expect(text(fixture)).toContain('No hay solicitudes');
      filters.clear();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
    });
    it('shows a list error and retries without reloading the page', () => {
      http.expectOne('/api/absences/my').flush({}, { status: 500, statusText: 'Error' });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
      click(fixture, '.absence-page > button');
      http.expectOne('/api/absences/my').flush([row]);
      fixture.detectChanges();
      expect(text(fixture)).toContain('Appointment');
    });
  });
  describe('Approvals', () => {
    let fixture: ComponentFixture<ApprovalsComponent>;
    beforeEach(() => {
      fixture = TestBed.createComponent(ApprovalsComponent);
      fixture.detectChanges();
      http.expectOne('/api/absences/pending').flush([row]);
      fixture.detectChanges();
    });
    it('renders the assigned pending list', () => {
      expect(text(fixture)).toContain('Test Employee');
      expect(fixture.nativeElement.querySelector('[aria-label="Aprobar r1"]')).not.toBeNull();
    });
    it('approves with an empty comment and refreshes the pending list', () => {
      click(fixture, '[aria-label="Aprobar r1"]');
      const req = http.expectOne('/api/absences/r1/approve');
      expect(req.request.body).toEqual({ comment: '' });
      req.flush({ ...row, status: 'APPROVED' });
      http.expectOne('/api/absences/pending').flush([]);
      fixture.detectChanges();
      expect(text(fixture)).toContain('Solicitud aprobada');
      expect(fixture.nativeElement.querySelector('[aria-label="Aprobar r1"]')).toBeNull();
    });
    it('rejects with a comment and refreshes the pending list', () => {
      click(fixture, '[aria-label="Rechazar r1"]');
      fixture.componentInstance.comment = 'Reschedule';
      fixture.componentInstance.reject();
      const req = http.expectOne('/api/absences/r1/reject');
      expect(req.request.body).toEqual({ comment: 'Reschedule' });
      req.flush({ ...row, status: 'REJECTED' });
      http.expectOne('/api/absences/pending').flush([]);
      fixture.detectChanges();
      expect(text(fixture)).toContain('Solicitud rechazada');
      expect(fixture.componentInstance.rejectingId).toBe('');
    });
    it('prevents repeated decisions while an HTTP request is pending', () => {
      fixture.componentInstance.approve('r1');
      fixture.componentInstance.approve('r1');
      http.expectOne('/api/absences/r1/approve').flush({ ...row, status: 'APPROVED' });
      http.expectOne('/api/absences/pending').flush([]);
    });
    it('shows permission failures without removing the pending row', () => {
      click(fixture, '[aria-label="Aprobar r1"]');
      http
        .expectOne('/api/absences/r1/approve')
        .flush({}, { status: 403, statusText: 'Forbidden' });
      fixture.detectChanges();
      expect(text(fixture)).toContain('permiso');
      expect(fixture.nativeElement.querySelector('[aria-label="Aprobar r1"]')).not.toBeNull();
    });
  });
  describe('Reports', () => {
    let fixture: ComponentFixture<ReportsComponent>;
    beforeEach(() => {
      fixture = TestBed.createComponent(ReportsComponent);
      fixture.detectChanges();
    });
    it('calculates personal KPIs from the my endpoint and separates full days', () => {
      http
        .expectOne('/api/absences/reporting')
        .flush([row, { ...row, id: 'r2', startTime: null, endTime: null, status: 'APPROVED' }]);
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="total"]').textContent.trim()).toBe(
        '2',
      );
      expect(text(fixture)).toContain('1 h 30 min');
      expect(text(fixture)).toContain('Días completos solicitados');
      expect(text(fixture)).not.toContain('Restaurar');
    });
    it('applies filters to both KPIs and breakdowns', () => {
      http
        .expectOne('/api/absences/reporting')
        .flush([row, { ...row, id: 'r2', status: 'APPROVED', type: 'OTHER' }]);
      fixture.detectChanges();
      const filters = fixture.debugElement.query(By.directive(AbsenceFiltersComponent))
        .componentInstance as AbsenceFiltersComponent;
      filters.value = { status: 'PENDING', date: '2026-10-01', search: 'Appointment', site: '' };
      filters.emit();
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[data-testid="total"]').textContent.trim()).toBe(
        '1',
      );
      expect(text(fixture)).not.toContain('OTHER');
    });
    it('shows no NaN values for an empty dataset', () => {
      http.expectOne('/api/absences/reporting').flush([]);
      fixture.detectChanges();
      expect(text(fixture)).toContain('0 h 0 min');
      expect(text(fixture)).not.toContain('NaN');
    });
    it('does not show misleading zero KPIs when the API fails', () => {
      http.expectOne('/api/absences/reporting').flush({}, { status: 500, statusText: 'Error' });
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
      expect(fixture.nativeElement.querySelector('[data-testid="total"]')).toBeNull();
    });
  });
});
