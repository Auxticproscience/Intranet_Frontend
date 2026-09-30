import { AsyncPipe } from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  ViewChild,
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

const MAX_SUPPORT_SIZE =
  5 * 1024 * 1024;

const SUPPORT_TYPES =
  new Set([
    'image/jpeg',
    'image/jpg',
    'image/png',
  ]);

const SUPPORT_EXTENSIONS =
  new Set([
    'jpg',
    'jpeg',
    'png',
  ]);

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

  @ViewChild('supportInput')
  supportInput?: ElementRef<HTMLInputElement>;

  selectedFile: File | null = null;
  fileError = '';

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

  onFileSelected(
    event: Event
  ): void {

    this.fileError = '';

    const input =
      event.target as HTMLInputElement;

    const file =
      input.files?.[0] ?? null;

    if (!file) {
      this.selectedFile = null;
      return;
    }

    const extension =
      file.name
        .split('.')
        .pop()
        ?.toLowerCase() ?? '';

    if (
      !SUPPORT_EXTENSIONS.has(extension) ||
      !SUPPORT_TYPES.has(file.type.toLowerCase())
    ) {

      this.selectedFile = null;

      this.fileError =
        'El soporte debe ser una imagen JPG, JPEG o PNG.';

      input.value = '';

      return;
    }

    if (file.size > MAX_SUPPORT_SIZE) {

      this.selectedFile = null;

      this.fileError =
        'El soporte no puede superar los 5 MB.';

      input.value = '';

      return;
    }

    this.selectedFile = file;
  }

  submit(): void {

    this.success = '';
    this.error = '';

    this.form.markAllAsTouched();

    if (
      this.form.invalid ||
      this.saving ||
      !!this.fileError
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
      },
      this.selectedFile)
      .subscribe({
        next: (request) => {

          this.form.reset();

          this.selectedFile = null;
          this.fileError = '';

          if (this.supportInput) {
            this.supportInput.nativeElement.value = '';
          }

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
