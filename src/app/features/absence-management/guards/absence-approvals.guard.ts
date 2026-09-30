import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import { AbsenceApiService } from '../services/absence-api.service';

export const absenceApprovalsGuard: CanActivateFn = () => {
  const api = inject(AbsenceApiService);
  const router = inject(Router);

  return api.getCapabilities().pipe(
    map((capabilities) =>
      capabilities.canApprove
        ? true
        : router.createUrlTree(['/absence-management/my-requests'])
    ),
    catchError(() =>
      of(router.createUrlTree(['/absence-management/my-requests']))
    ),
  );
};
