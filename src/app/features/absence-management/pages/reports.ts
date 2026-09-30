import { Component, inject } from '@angular/core';
import { AsyncPipe } from '@angular/common';
import { BehaviorSubject, combineLatest, map } from 'rxjs';
import { AbsenceService } from '../services/absence.service';
import {
  AbsenceFilters,
  filterRequests,
  formatDuration,
  summarize,
} from '../models/absence-request';
import { AbsenceFiltersComponent } from '../components/absence-filters';
@Component({
  selector: 'app-absence-reports',
  standalone: true,
  imports: [AsyncPipe, AbsenceFiltersComponent],
  templateUrl: './reports.html',
  styleUrl: '../absence.scss',
})
export class ReportsComponent {
  readonly service = inject(AbsenceService);
  readonly filters = new BehaviorSubject<AbsenceFilters>({
    status: '',
    date: '',
    search: '',
    site: '',
  });
  readonly view$ = combineLatest([this.service.reportingState$, this.filters]).pipe(
    map(([state, filters]) => ({
      ...state,
      summary: summarize(filterRequests(state.data, filters)),
    })),
  );
  readonly duration = formatDuration;
}
