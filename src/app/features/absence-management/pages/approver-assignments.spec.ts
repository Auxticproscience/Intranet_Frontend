import { TestBed, ComponentFixture } from '@angular/core/testing';
import { provideZonelessChangeDetection } from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { firstValueFrom, Observable } from 'rxjs';
import { ApproverAssignmentsComponent } from './approver-assignments';
import { absenceTypesGuard } from '../guards/absence-types.guard';

const url = '/api/absence-approver-assignments';
const users = [
  { id: 'e/1', name: 'Ana Empleada', email: 'ana@example.test', sede: 'Bogotá', position: 'Analista', username: 'ana' },
  { id: 'j1', name: 'Juan Jefe', email: 'juan@example.test', sede: 'Bogotá', position: 'Jefe', username: 'juan' },
];
const assignment = {
  id: 1, employeeId: 'e/1', employeeName: users[0].name, employeeEmail: users[0].email,
  approverId: 'j1', approverName: users[1].name, approverEmail: users[1].email, active: true,
};

describe('Approver assignments administration', () => {
  let fixture: ComponentFixture<ApproverAssignmentsComponent>;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ApproverAssignmentsComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  function start(assignments = [assignment]) {
    fixture = TestBed.createComponent(ApproverAssignmentsComponent);
    fixture.detectChanges();
    http.expectOne(`${url}/users`).flush(users);
    http.expectOne(url).flush(assignments);
    fixture.detectChanges();
    return fixture.componentInstance;
  }
  it('shows active users including employees without assignments and filters by email', async () => {
    start();
    expect(fixture.nativeElement.textContent).toContain('Sin asignación');
    const input = fixture.nativeElement.querySelector('input[type=search]');
    input.value = 'ANA@';
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
  });
  it('preselects the current boss and excludes the employee from boss options', () => {
    const page = start();
    page.selectEmployee('e/1');
    expect(page.form.getRawValue()).toEqual({ employeeId: 'e/1', approverId: 'j1' });
    expect(page.approvers.map(user => user.id)).toEqual(['j1']);
  });
  it('requires both users and prevents self assignment without sending a request', () => {
    const page = start([]);
    page.save();
    expect(page.form.invalid).toBeTrue();
    page.form.setValue({ employeeId: 'e/1', approverId: 'e/1' });
    page.save();
    expect(page.error).toContain('propio jefe');
    http.expectNone(`${url}/e%2F1`);
  });
  it('assigns with the backend contract, encodes ids and prevents duplicate saves', () => {
    const page = start([]);
    page.form.setValue({ employeeId: 'e/1', approverId: 'j1' });
    page.save();
    page.save();
    expect(page.form.disabled).toBeTrue();
    const req = http.expectOne(`${url}/e%2F1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ approverId: 'j1' });
    req.flush(assignment);
    fixture.detectChanges();
    expect(page.assignmentFor('e/1')?.active).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('asignado correctamente');
    expect(page.form.enabled).toBeTrue();
  });
  it('deactivates and can reactivate the existing assignment by saving', () => {
    const page = start();
    page.deactivate(assignment);
    page.deactivate(assignment);
    const req = http.expectOne(`${url}/e%2F1/deactivate`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({});
    req.flush({ ...assignment, active: false });
    page.selectEmployee('e/1');
    page.save();
    http.expectOne(`${url}/e%2F1`).flush(assignment);
    expect(page.assignmentFor('e/1')?.active).toBeTrue();
  });
  it('retains the form and assignment on forbidden writes', () => {
    const page = start();
    page.selectEmployee('e/1');
    page.save();
    http.expectOne(`${url}/e%2F1`).flush({}, { status: 403, statusText: 'Forbidden' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('permiso');
    expect(page.form.getRawValue().approverId).toBe('j1');
    expect(page.saving).toBeFalse();
    expect(page.assignments).toEqual([assignment]);
  });
  it('shows a load failure and retries both endpoints', () => {
    fixture = TestBed.createComponent(ApproverAssignmentsComponent);
    fixture.detectChanges();
    http.expectOne(`${url}/users`).flush(users);
    http.expectOne(url).flush({}, { status: 500, statusText: 'Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    fixture.nativeElement.querySelector('button').click();
    http.expectOne(`${url}/users`).flush(users);
    http.expectOne(url).flush([]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('form')).not.toBeNull();
  });
  for (const allowed of [true, false]) {
    it(`guards administrative access when management capability is ${allowed}`, async () => {
      const result = TestBed.runInInjectionContext(() => absenceTypesGuard({} as never, {} as never));
      const promise = firstValueFrom(result as Observable<unknown>);
      http.expectOne('/api/absences/capabilities').flush({ canManageAbsenceTypes: allowed });
      const value = await promise;
      if (allowed) expect(value).toBeTrue();
      else expect(TestBed.inject(Router).serializeUrl(value as never)).toBe('/absence-management/my-requests');
    });
  }
  it('denies administrative access when capabilities cannot be loaded', async () => {
    const result = TestBed.runInInjectionContext(() => absenceTypesGuard({} as never, {} as never));
    const promise = firstValueFrom(result as Observable<unknown>);
    http.expectOne('/api/absences/capabilities').flush({}, { status: 500, statusText: 'Error' });
    expect(TestBed.inject(Router).serializeUrl(await promise as never)).toBe('/absence-management/my-requests');
  });
});
