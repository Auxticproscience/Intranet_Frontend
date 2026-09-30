import { AsyncPipe } from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  inject,
} from '@angular/core';

import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { shareReplay } from 'rxjs';

import { AbsenceService } from '../services/absence.service';
import { AbsenceApiService } from '../services/absence-api.service';

import {
  localDate,
  validRange,
} from '../models/absence-request';

export function absenceRangeValidator(
  control: AbstractControl,
): ValidationErrors | null {

  const v = control.value;

  if (
    !v.departureDate ||
    !v.departureTime ||
    !v.returnDate ||
    !v.returnTime
  ) {
    return null;
  }

  return validRange(
    `${v.departureDate}T${v.departureTime}`,
    `${v.returnDate}T${v.returnTime}`,
  )
    ? null
    : { invalidRange: true };
}

@Component({
  selector: 'app-absence-new-request',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    AsyncPipe,
  ],
  templateUrl: './new-request.html',
  styleUrl: '../absence.scss',
})
export class NewRequestComponent {

  readonly service =
    inject(AbsenceService);

  private readonly absenceApi =
    inject(AbsenceApiService);

  private readonly cdr =
    inject(ChangeDetectorRef);

  readonly profileState$ =
    this.service.profileState$;

  readonly absenceTypes$ =
    this.absenceApi
      .getActiveTypes()
      .pipe(
        shareReplay({
          bufferSize: 1,
          refCount: true,
        })
      );

  get requestDate() {
    return localDate();
  }

  readonly form =
    inject(FormBuilder)
      .nonNullable
      .group(
        {
          type: [
            '',
            Validators.required,
          ],

          departureDate: [
            '',
            Validators.required,
          ],

          departureTime: [
            '',
            Validators.required,
          ],

          returnDate: [
            '',
            Validators.required,
          ],

          returnTime: [
            '',
            Validators.required,
          ],

          reason: [
            '',
            [
              Validators.required,
              Validators.maxLength(2000),
              (c: AbstractControl) =>
                c.value.trim()
                  ? null
                  : { required: true },
            ],
          ],
        },
        {
          validators:
            absenceRangeValidator,
        },
      );

  success = '';
  error = '';
  saving = false;

  submit(): void {

    this.success = '';
    this.error = '';

    this.form.markAllAsTouched();

    if (
      this.form.invalid ||
      this.saving
    ) {
      return;
    }

    const v =
      this.form.getRawValue();

    this.saving = true;

    this.service
      .createRequest({
        type: v.type,
        startDate:
          v.departureDate,
        endDate:
          v.returnDate,
        startTime:
          v.departureTime,
        endTime:
          v.returnTime,
        reason:
          v.reason.trim(),
      })
      .subscribe({
        next: (request) => {

          this.form.reset();

          this.success =
            `Solicitud creada. Aprobador: ${request.approverName}. Puede consultarla en Mis solicitudes.`;

          this.saving = false;

          this.cdr.markForCheck();
        },

        error: (error: Error) => {

          this.error =
            error.message;

          this.saving = false;

          this.cdr.markForCheck();
        },
      });
  }
}
