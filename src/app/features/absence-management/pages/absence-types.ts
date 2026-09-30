import {
  CommonModule,
} from '@angular/common';

import {
  ChangeDetectorRef,
  Component,
  OnInit,
  inject,
} from '@angular/core';

import {
  FormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  AbsenceTypeResponse,
} from '../models/absence-api';

import {
  AbsenceApiService,
} from '../services/absence-api.service';

@Component({
  selector: 'app-absence-types',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
  ],
  templateUrl: './absence-types.html',
  styleUrl: '../absence.scss',
})
export class AbsenceTypesComponent
  implements OnInit {

  private readonly api =
    inject(AbsenceApiService);

  private readonly cdr =
    inject(ChangeDetectorRef);

  readonly form =
    inject(FormBuilder)
      .nonNullable
      .group({
        name: [
          '',
          [
            Validators.required,
            Validators.maxLength(100),
          ],
        ],

        description: [
          '',
          Validators.maxLength(500),
        ],
      });

  types: AbsenceTypeResponse[] = [];

  editingId: number | null = null;

  loading = false;
  saving = false;

  error = '';
  success = '';

  ngOnInit(): void {
    this.load();
  }

  load(): void {

    this.loading = true;
    this.error = '';

    this.api
      .getAllTypes()
      .subscribe({
        next: (types) => {

          this.types = types;

          this.loading = false;

          this.cdr.markForCheck();
        },

        error: (error) => {

          this.error =
            this.errorMessage(error);

          this.loading = false;

          this.cdr.markForCheck();
        },
      });
  }

  save(): void {

    this.error = '';
    this.success = '';

    this.form.markAllAsTouched();

    if (
      this.form.invalid ||
      this.saving
    ) {
      return;
    }

    const value =
      this.form.getRawValue();

    const name =
      value.name.trim();

    const description =
      value.description.trim() || null;

    this.saving = true;

    if (this.editingId === null) {

      this.api
        .createType({
          name,
          description,
          active: true,
        })
        .subscribe({
          next: () => {

            this.success =
              'Tipo de ausencia creado correctamente.';

            this.saving = false;

            this.cancelEdit();

            this.load();
          },

          error: (error) => {

            this.error =
              this.errorMessage(error);

            this.saving = false;

            this.cdr.markForCheck();
          },
        });

      return;
    }

    const current =
      this.types.find(
        (item) =>
          item.id === this.editingId,
      );

    this.api
      .updateType(
        this.editingId,
        {
          name,
          description,
          active:
            current?.active ?? true,
        },
      )
      .subscribe({
        next: () => {

          this.success =
            'Tipo de ausencia actualizado correctamente.';

          this.saving = false;

          this.cancelEdit();

          this.load();
        },

        error: (error) => {

          this.error =
            this.errorMessage(error);

          this.saving = false;

          this.cdr.markForCheck();
        },
      });
  }

  edit(
    type: AbsenceTypeResponse,
  ): void {

    this.editingId =
      type.id;

    this.error = '';
    this.success = '';

    this.form.setValue({
      name:
        type.name,

      description:
        type.description ?? '',
    });

    this.cdr.markForCheck();
  }

  cancelEdit(): void {

    this.editingId = null;

    this.form.reset({
      name: '',
      description: '',
    });

    this.cdr.markForCheck();
  }

  toggle(
    type: AbsenceTypeResponse,
  ): void {

    this.error = '';
    this.success = '';

    const request =
      type.active
        ? this.api.deactivateType(type.id)
        : this.api.activateType(type.id);

    request.subscribe({
      next: () => {

        this.success =
          type.active
            ? 'Tipo de ausencia desactivado.'
            : 'Tipo de ausencia activado.';

        this.load();
      },

      error: (error) => {

        this.error =
          this.errorMessage(error);

        this.cdr.markForCheck();
      },
    });
  }

  private errorMessage(
    error: any,
  ): string {

    return (
      error?.error?.message ||
      error?.error?.error ||
      error?.message ||
      'No fue posible completar la operación.'
    );
  }
}
