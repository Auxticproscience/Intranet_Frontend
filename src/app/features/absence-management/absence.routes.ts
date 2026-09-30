import { Routes } from '@angular/router';

import { absenceApprovalsGuard } from './guards/absence-approvals.guard';
import { absenceIndicatorsGuard } from './guards/absence-indicators.guard';
import { absenceTypesGuard } from './guards/absence-types.guard';

export const ABSENCE_ROUTES: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'my-requests',
  },
  {
    path: 'new',
    loadComponent: () =>
      import('./pages/new-request')
        .then((m) => m.NewRequestComponent),
  },
  {
    path: 'my-requests',
    loadComponent: () =>
      import('./pages/my-requests')
        .then((m) => m.MyRequestsComponent),
  },
  {
    path: 'approvals',
    canActivate: [absenceApprovalsGuard],
    loadComponent: () =>
      import('./pages/approvals')
        .then((m) => m.ApprovalsComponent),
  },
  {
    path: 'approver-assignments',
    canActivate: [absenceTypesGuard],
    loadComponent: () => import('./pages/approver-assignments').then((m) => m.ApproverAssignmentsComponent),
  },
  {
    path: 'types',
    canActivate: [absenceTypesGuard],
    loadComponent: () =>
      import('./pages/absence-types')
        .then((m) => m.AbsenceTypesComponent),
  },
  {
    path: 'reports',
    canActivate: [absenceIndicatorsGuard],
    loadComponent: () =>
      import('./pages/reports')
        .then((m) => m.ReportsComponent),
  },
];
