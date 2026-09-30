import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
} from '@angular/core';
import {
  AbsenceRequest,
  STATUS_LABELS,
  durationMinutes,
  formatDuration,
  fullDays,
} from '../models/absence-request';
import { AbsenceService } from '../services/absence.service';
@Component({
  selector: 'app-absence-table',
  standalone: true,
  styleUrl: '../absence.scss',
  template: `<div
    class="table-scroll"
    role="region"
    aria-label="Solicitudes de ausencia"
    tabindex="0"
  >
    <table>
      <caption>
        {{
          rows.length
        }}
        solicitudes · Fechas y horas locales del centro de operación
      </caption>
      <thead>
        <tr>
          @if (approval) {
            <th scope="col">Empleado</th>
          }
          <th scope="col">Solicitud</th>
          <th scope="col">Salida</th>
          <th scope="col">Regreso</th>
          <th scope="col">Duración</th>
          <th scope="col">Motivo</th>
          <th scope="col">Aprobador</th>
          <th scope="col">Estado</th>
          <th scope="col">Acciones</th>
        </tr>
      </thead>
      <tbody>
        @for (row of rows; track row.id) {
          <tr>
            @if (approval) {
              <td>
                <strong>{{ row.employeeName }}</strong
                ><small>{{ row.type }}</small>
              </td>
            }
            <td>
              {{ row.requestDate }}<small>{{ row.id }}</small>
            </td>
            <td class="date">{{ row.departureAt.replace('T', ' ') }}</td>
            <td class="date">{{ row.returnAt.replace('T', ' ') }}</td>
            <td class="date">{{ duration(row) }}</td>
            <td class="reason">
              <small>{{ row.type }}</small
              >{{ row.reason }}
              @if (row.bossDecision) {
                <small>
                  Jefe: {{ decisionLabel(row.bossDecision) }}
                  @if (row.bossDecisionDate) {
                    · {{ row.bossDecisionDate }}
                  }
                </small>
              }

              @if (row.bossComment) {
                <small>Comentario jefe: {{ row.bossComment }}</small>
              }

              @if (row.hrDecision) {
                <small>
                  Talento Humano: {{ decisionLabel(row.hrDecision) }}
                  @if (row.hrDecisionDate) {
                    · {{ row.hrDecisionDate }}
                  }
                </small>
              }

              @if (row.hrComment) {
                <small>Comentario TH: {{ row.hrComment }}</small>
              }

              @if (
                row.decisionComment &&
                !row.hrComment &&
                !row.bossComment
              ) {
                <small>Comentario: {{ row.decisionComment }}</small>
              }

              @if (
                row.decisionDate &&
                !row.hrDecisionDate &&
                !row.bossDecisionDate
              ) {
                <small>Decisión: {{ row.decisionDate }}</small>
              }
            </td>
            <td>{{ row.approverName }}</td>
            <td>
              <span class="badge" [attr.data-status]="row.status">{{ labels[row.status] }}</span>
            </td>
            <td>
              <div class="actions">

                @if (row.supportFile) {

                  <button
                    type="button"
                    class="secondary"
                    [disabled]="busy || downloadingId === row.id"
                    [attr.aria-label]="'Descargar soporte ' + row.id"
                    (click)="downloadSupport(row)"
                  >
                    {{
                      downloadingId === row.id
                        ? 'Descargando…'
                        : 'Ver soporte'
                    }}
                  </button>

                }

                @if (
                  approval &&
                  (row.status === 'PENDING' ||
                   row.status === 'PENDING_HR')
                ) {

                  <button
                    type="button"
                    [disabled]="busy"
                    [attr.aria-label]="'Aprobar ' + row.id"
                    (click)="approve.emit(row.id)"
                  >
                    Aprobar
                  </button>

                  <button
                    type="button"
                    [disabled]="busy"
                    class="secondary"
                    [attr.aria-label]="'Rechazar ' + row.id"
                    (click)="reject.emit(row.id)"
                  >
                    Rechazar
                  </button>

                }

                @if (
                  !row.supportFile &&
                  !(
                    approval &&
                    (row.status === 'PENDING' ||
                     row.status === 'PENDING_HR')
                  )
                ) {
                  <span>—</span>
                }

              </div>
            </td>
          </tr>
        } @empty {
          <tr>
            <td [attr.colspan]="approval ? 9 : 8" class="empty">
              No hay solicitudes para mostrar.
            </td>
          </tr>
        }
      </tbody>
    </table>
  </div>

  @if (downloadError) {
    <p
      class="notice error"
      role="alert">
      {{ downloadError }}
    </p>
  }
  `,
})
export class AbsenceTableComponent {
  @Input() rows: AbsenceRequest[] = [];
  @Input() approval = false;
  @Input() busy = false;
  @Output() approve = new EventEmitter<string>();
  @Output() reject = new EventEmitter<string>();
  private readonly service =
    inject(AbsenceService);

  downloadingId: string | null = null;
  downloadError = '';

  downloadSupport(
    row: AbsenceRequest
  ): void {

    this.downloadError = '';
    this.downloadingId = row.id;

    this.service
      .getSupport(row.id)
      .subscribe({
        next: (blob) => {

          const extension =
            blob.type === 'image/png'
              ? 'png'
              : 'jpg';

          const objectUrl =
            URL.createObjectURL(blob);

          const link =
            document.createElement('a');

          link.href = objectUrl;
          link.download =
            `soporte-ausencia-${row.id}.${extension}`;

          document.body.appendChild(link);
          link.click();
          link.remove();

          URL.revokeObjectURL(
            objectUrl
          );

          this.downloadingId = null;
        },

        error: () => {

          this.downloadError =
            'No fue posible descargar el soporte de esta solicitud.';

          this.downloadingId = null;
        },
      });
  }

  readonly labels = STATUS_LABELS;

  decisionLabel(value: string | null | undefined): string {
    if (value === 'APPROVED') return 'Aprobada';
    if (value === 'REJECTED') return 'Rechazada';
    return value ?? '';
  }

  duration(row: AbsenceRequest) {
    return row.allDay
      ? `${fullDays(row)} día(s) completo(s)`
      : formatDuration(durationMinutes(row));
  }
}
