import { AbsenceResponse } from './absence-api';
export const ABSENCE_STATUSES = ['PENDING', 'PENDING_HR', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;
export type AbsenceStatus = (typeof ABSENCE_STATUSES)[number];
export const STATUS_LABELS: Record<AbsenceStatus, string> = {
  PENDING: 'Pendiente de jefe',
  PENDING_HR: 'Pendiente de Talento Humano',
  APPROVED: 'Aprobada',
  REJECTED: 'Rechazada',
  CANCELLED: 'Cancelada',
};
export interface AbsenceRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  site: string;
  type: string;
  allDay: boolean;
  supportFile: string | null;
  requestDate: string;
  /** Local operation-center wall time: YYYY-MM-DDTHH:mm (no UTC conversion). */
  departureAt: string;
  returnAt: string;
  reason: string;
  approverId: string;
  approverName: string;
  status: AbsenceStatus;
  decisionComment?: string;
  decisionDate?: string;

  bossDecision?: string | null;
  bossDecisionDate?: string;
  bossComment?: string | null;

  hrDecision?: string | null;
  hrDecisionDate?: string;
  hrComment?: string | null;
}
export interface AbsenceFilters {
  status: string;
  date: string;
  search: string;
  site: string;
}
/** Parse strictly and use UTC arithmetic for consistent wall-clock durations across browsers. */
export function wallTime(value: string): number {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return NaN;
  const time = Date.parse(value + ':00Z');
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 16) === value ? time : NaN;
}
export function validRange(departureAt: string, returnAt: string): boolean {
  return wallTime(returnAt) > wallTime(departureAt);
}
export function durationMinutes(
  request: Pick<AbsenceRequest, 'departureAt' | 'returnAt' | 'allDay'>,
): number {
  if (request.allDay) return 0;
  return (wallTime(request.returnAt) - wallTime(request.departureAt)) / 60000;
}
export function formatDuration(minutes: number): string {
  const rounded = Math.round(minutes);
  return `${Math.floor(rounded / 60)} h ${rounded % 60} min`;
}
export function localDate(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function filterRequests(
  requests: AbsenceRequest[],
  filters: AbsenceFilters,
): AbsenceRequest[] {
  const search = filters.search.trim().toLocaleLowerCase();
  return requests.filter(
    (r) =>
      (!filters.status || r.status === filters.status) &&
      (!filters.date || r.departureAt.slice(0, 10) === filters.date) &&
      (!filters.site || r.site === filters.site) &&
      (!search ||
        [r.employeeName, r.type, r.reason, r.approverName, r.id].some((value) =>
          value.toLocaleLowerCase().includes(search),
        )),
  );
}
export function summarize(requests: AbsenceRequest[]) {
  const totalMinutes = requests.reduce((sum, r) => sum + durationMinutes(r), 0);
  const timedCount = requests.filter((r) => !r.allDay).length;
  const breakdown = (key: 'type' | 'reason') =>
    [...new Set(requests.map((r) => r[key]))]
      .sort()
      .map((label) => ({ label, count: requests.filter((r) => r[key] === label).length }));
  return {
    total: requests.length,
    totalMinutes,
    averageMinutes: timedCount ? totalMinutes / timedCount : 0,
    fullDays: requests.filter((r) => r.allDay).reduce((sum, r) => sum + fullDays(r), 0),
    statuses: ABSENCE_STATUSES.map((status) => ({
      status,
      label: STATUS_LABELS[status],
      count: requests.filter((r) => r.status === status).length,
    })),
    types: breakdown('type'),
    reasons: breakdown('reason'),
  };
}

export function fullDays(request: Pick<AbsenceRequest, 'departureAt' | 'returnAt'>): number {
  return (
    (wallTime(request.returnAt.slice(0, 10) + 'T00:00') -
      wallTime(request.departureAt.slice(0, 10) + 'T00:00')) /
      86400000 +
    1
  );
}
export function toAbsenceRequest(dto: AbsenceResponse): AbsenceRequest {
  const allDay = dto.startTime == null && dto.endTime == null;
  return {
    id: dto.id,
    employeeId: dto.requesterId,
    employeeName: dto.requesterName,
    site: '',
    type: dto.type,
    allDay,
    supportFile: dto.supportFile,
    requestDate: dto.createdAt.slice(0, 10),
    departureAt: dto.startDate + (dto.startTime ? 'T' + dto.startTime.slice(0, 5) : ''),
    returnAt: dto.endDate + (dto.endTime ? 'T' + dto.endTime.slice(0, 5) : ''),
    reason: dto.reason,
    approverId: dto.approverId,
    approverName: dto.approverName,
    status: dto.status,

    decisionComment: dto.approvalComment ?? undefined,
    decisionDate:
      dto.status === 'PENDING' || dto.status === 'PENDING_HR'
        ? undefined
        : (dto.approvedAt ?? dto.updatedAt).slice(0, 10),

    bossDecision: dto.bossDecision ?? null,
    bossDecisionDate: dto.bossDecisionAt?.slice(0, 10),
    bossComment: dto.bossComment ?? null,

    hrDecision: dto.hrDecision ?? null,
    hrDecisionDate: dto.hrDecisionAt?.slice(0, 10),
    hrComment: dto.hrComment ?? null,
  };
}
