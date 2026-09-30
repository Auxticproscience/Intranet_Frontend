import { ChangeDetectorRef, Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AbsenceService } from '../services/absence.service';
import { AbsenceTableComponent } from '../components/absence-table';
@Component({
  selector: 'app-absence-approvals',
  standalone: true,
  imports: [AsyncPipe, FormsModule, AbsenceTableComponent],
  styleUrl: '../absence.scss',
  template: `<section class="absence-page">
    <header>
      <p class="eyebrow">Gestión de ausencias</p>
      <h1>Aprobaciones</h1>
      <p>Aquí se muestran únicamente las solicitudes que están pendientes de tu aprobación.</p>
    </header>
    @if (message) {
      <p class="notice success" role="status">{{ message }}</p>
    }
    @if (error) {
      <p class="notice error" role="alert">{{ error }}</p>
    }
    @if (rejectingId) {
      <section class="panel" aria-label="Rechazar solicitud">
        <h2>Rechazar {{ rejectingId }}</h2>
        <label
          >Comentario opcional<textarea
            rows="3"
            maxlength="2000"
            [disabled]="saving"
            [(ngModel)]="comment"
          ></textarea>
        </label>
        <div class="actions">
          <button type="button" [disabled]="saving" (click)="reject()">Confirmar rechazo</button
          ><button
            type="button"
            class="secondary"
            [disabled]="saving"
            (click)="rejectingId = ''; comment = ''"
          >
            Volver
          </button>
        </div>
      </section>
    }
    @if (service.pendingState$ | async; as state) {
      @if (state.loading) {
        <p role="status">Cargando solicitudes pendientes…</p>
      } @else if (state.error) {
        <p class="notice error" role="alert">{{ state.error }}</p>
      } @else {
        <app-absence-table
          [rows]="state.data"
          [approval]="true"
          [busy]="saving"
          (approve)="approve($event)"
          (reject)="startReject($event)"
        />
      }
      <button
        type="button"
        class="secondary"
        [disabled]="state.loading || saving"
        (click)="service.reloadPendingApprovals()"
      >
        Actualizar pendientes
      </button>
    }
  </section>`,
})
export class ApprovalsComponent {
  readonly service = inject(AbsenceService);
  private readonly cdr = inject(ChangeDetectorRef);
  saving = false;
  rejectingId = '';
  comment = '';
  message = '';
  error = '';
  startReject(id: string) {
    if (this.saving) return;
    this.rejectingId = id;
    this.comment = '';
    this.message = '';
    this.error = '';
  }
  approve(id: string) {
    if (this.saving) return;
    this.saving = true;
    this.message = '';
    this.error = '';
    this.service.approveRequest(id).subscribe({
      next: () => {
        this.saving = false;
        this.cdr.markForCheck();
        this.message = 'Solicitud aprobada.';
        if (this.rejectingId === id) this.rejectingId = '';
      },
      error: (e: Error) => {
        this.error = e.message;
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }
  reject() {
    if (this.saving || !this.rejectingId) return;
    if (this.comment.length > 2000) {
      this.error = 'El comentario no debe superar 2000 caracteres.';
      return;
    }
    this.saving = true;
    this.message = '';
    this.error = '';
    this.service.rejectRequest(this.rejectingId, this.comment).subscribe({
      next: () => {
        this.saving = false;
        this.cdr.markForCheck();
        this.message = 'Solicitud rechazada.';
        this.rejectingId = '';
        this.comment = '';
      },
      error: (e: Error) => {
        this.error = e.message;
        this.saving = false;
        this.cdr.markForCheck();
      },
    });
  }
}
