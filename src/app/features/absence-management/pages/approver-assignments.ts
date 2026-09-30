import { Component, ChangeDetectorRef, OnInit, inject } from '@angular/core';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { AbsenceApiService } from '../services/absence-api.service';
import { AbsenceApproverAssignment, AbsenceApproverUser } from '../models/absence-api';

@Component({
  selector: 'app-approver-assignments',
  standalone: true,
  imports: [FormsModule, ReactiveFormsModule],
  templateUrl: './approver-assignments.html',
  styleUrl: '../absence.scss',
})
export class ApproverAssignmentsComponent implements OnInit {
  private readonly api = inject(AbsenceApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly form = inject(FormBuilder).nonNullable.group({
    employeeId: ['', Validators.required],
    approverId: ['', Validators.required],
  });
  users: AbsenceApproverUser[] = [];
  assignments: AbsenceApproverAssignment[] = [];
  search = '';
  loading = false;
  loaded = false;
  saving = false;
  error = '';
  success = '';

  get filteredUsers() {
    const query = this.search.trim().toLocaleLowerCase();
    return this.users.filter(user =>
      [user.name, user.email, user.sede, user.position].some(value =>
        value?.toLocaleLowerCase().includes(query)));
  }

  get approvers() {
    return this.users.filter(user => user.id !== this.form.controls.employeeId.value);
  }

  assignmentFor(employeeId: string) {
    return this.assignments.find(item => item.employeeId === employeeId);
  }

  ngOnInit(): void { this.load(); }

  load(): void {
    if (this.loading || this.saving) return;
    this.loading = true;
    this.loaded = false;
    this.error = '';
    forkJoin({ users: this.api.getApproverUsers(), assignments: this.api.getApproverAssignments() })
      .subscribe({
        next: data => {
          this.users = data.users;
          this.assignments = data.assignments;
          this.loading = false;
          this.loaded = true;
          this.cdr.markForCheck();
        },
        error: error => {
          this.error = this.errorMessage(error);
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  selectEmployee(employeeId = this.form.controls.employeeId.value): void {
    if (this.saving) return;
    this.form.setValue({ employeeId, approverId: this.assignmentFor(employeeId)?.approverId ?? '' });
    this.form.markAsUntouched();
    this.error = '';
    this.success = '';
  }

  save(): void {
    if (this.saving || this.loading || !this.loaded) return;
    this.form.markAllAsTouched();
    this.error = '';
    this.success = '';
    if (this.form.invalid) return;
    const { employeeId, approverId } = this.form.getRawValue();
    if (employeeId === approverId) {
      this.error = 'El empleado no puede ser su propio jefe inmediato.';
      return;
    }
    if (![employeeId, approverId].every(id => this.users.some(user => user.id === id))) {
      this.error = 'Selecciona un empleado y un jefe activos.';
      return;
    }
    this.update(this.api.assignApprover(employeeId, approverId), 'Jefe inmediato asignado correctamente.');
  }

  deactivate(assignment: AbsenceApproverAssignment): void {
    if (this.saving || this.loading || !this.loaded || !assignment.active) return;
    this.update(this.api.deactivateApproverAssignment(assignment.employeeId), 'Asignación desactivada correctamente.');
  }

  private update(request: ReturnType<AbsenceApiService['assignApprover']>, message: string): void {
    this.error = '';
    this.success = '';
    this.saving = true;
    this.form.disable();
    request.subscribe({
      next: assignment => {
        this.assignments = [...this.assignments.filter(item => item.employeeId !== assignment.employeeId), assignment];
        this.success = message;
        this.saving = false;
        this.form.enable();
        this.cdr.markForCheck();
      },
      error: error => {
        this.error = this.errorMessage(error);
        this.saving = false;
        this.form.enable();
        this.cdr.markForCheck();
      },
    });
  }

  private errorMessage(error: HttpErrorResponse): string {
    return error.error?.message || error.error?.error ||
      (error.status === 403 ? 'No tienes permiso para administrar las asignaciones.' : 'No fue posible completar la operación. Intenta nuevamente.');
  }
}
