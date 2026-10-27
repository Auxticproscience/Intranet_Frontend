import { Component, OnInit, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  RequirementsService,
  RequirementResponse,
} from '../../../../core/services/requirements.service';
import { AreaService } from '../../../../core/services/area.service';
import { AreaResponse } from '../../../../core/models/area.model';

@Component({
  standalone: true,
  selector: 'app-reports',
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.html',
  styleUrl: './reports.scss',
})
export class ReportsComponent implements OnInit, AfterViewInit {
  @ViewChild('chartByStatus') chartByStatus!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartByArea') chartByArea!: ElementRef<HTMLCanvasElement>;
  @ViewChild('chartByPriority') chartByPriority!: ElementRef<HTMLCanvasElement>;

  // Filters
  filterStatus = '';
  filterArea = '';
  filterPriority = '';
  filterFrom = '';
  filterTo = '';

  allRequirements: RequirementResponse[] = [];
  filtered: RequirementResponse[] = [];
  areas: AreaResponse[] = [];
  loading = true;

  // KPIs
  get total() {
    return this.filtered.length;
  }
  get pendientes() {
    return this.filtered.filter((r) => r.status === 'PENDING').length;
  }
  get enProceso() {
    return this.filtered.filter((r) => r.status === 'IN_PROGRESS').length;
  }
  get completados() {
    return this.filtered.filter((r) => r.status === 'COMPLETED').length;
  }
  get cancelados() {
    return this.filtered.filter((r) => r.status === 'REJECTED').length;
  }

  constructor(
    private requirementsService: RequirementsService,
    private areaService: AreaService,
  ) {}

  ngOnInit(): void {
    this.loadAreas();
    this.loadRequirements();
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.drawAllCharts(), 200);
  }

  loadAreas(): void {
    this.areaService.findAll().subscribe({
      next: (data) => (this.areas = data),
      error: (err) => console.error('Error cargando áreas', err),
    });
  }

  loadRequirements(): void {
    this.loading = true;
    this.requirementsService.getAll().subscribe({
      next: (data) => {
        this.allRequirements = data;
        this.filtered = data;
        this.loading = false;
        setTimeout(() => this.drawAllCharts(), 100);
      },
      error: (err) => {
        console.error('Error cargando requerimientos', err);
        this.loading = false;
      },
    });
  }

  applyFilters(): void {
    this.filtered = this.allRequirements.filter((r) => {
      const okStatus = !this.filterStatus || r.status === this.filterStatus;
      const okArea = !this.filterArea || r.areaId === Number(this.filterArea);
      const okPriority = !this.filterPriority || r.priority === this.filterPriority;
      const okFrom = !this.filterFrom || r.createdAt >= this.filterFrom;
      const okTo = !this.filterTo || r.createdAt <= this.filterTo;
      return okStatus && okArea && okPriority && okFrom && okTo;
    });
    setTimeout(() => this.drawAllCharts(), 50);
  }

  clearFilters(): void {
    this.filterStatus = '';
    this.filterArea = '';
    this.filterPriority = '';
    this.filterFrom = '';
    this.filterTo = '';
    this.applyFilters();
  }

  translateStatus(status: string): string {
    const map: Record<string, string> = {
      PENDING: 'Pendiente',
      IN_PROGRESS: 'En proceso',
      COMPLETED: 'Completado',
      REJECTED: 'Rechazado',
    };
    return map[status] ?? status;
  }

  translatePriority(priority: string): string {
    const map: Record<string, string> = {
      BAJA: 'Baja',
      MEDIA: 'Media',
      ALTA: 'Alta',
      CRITICA: 'Crítica',
    };
    return map[priority] ?? priority;
  }

  // ── Charts ──────────────────────────
  private drawAllCharts(): void {
    this.drawDonut(this.chartByStatus?.nativeElement, this.statusData());
    this.drawBars(this.chartByArea?.nativeElement, this.areaData());
    this.drawBars(this.chartByPriority?.nativeElement, this.priorityData());
  }

  statusData() {
    return {
      labels: ['Pendiente', 'En proceso', 'Completado', 'Rechazado'],
      values: [this.pendientes, this.enProceso, this.completados, this.cancelados],
      colors: ['#e65100', '#1565c0', '#2e7d32', '#c62828'],
    };
  }

  areaData() {
    const areaNames = [...new Set(this.allRequirements.map((r) => r.areaName))];
    return {
      labels: areaNames,
      values: areaNames.map((a) => this.filtered.filter((r) => r.areaName === a).length),
      colors: [
        '#0A142D',
        '#CC521B',
        '#90574D',
        '#94B6EF',
        '#CCBBA7',
        '#2e7d32',
        '#1565c0',
        '#f57f17',
        '#6a1b9a',
        '#00838f',
      ],
    };
  }

  priorityData() {
    return {
      labels: ['Baja', 'Media', 'Alta', 'Crítica'],
      values: ['BAJA', 'MEDIA', 'ALTA', 'CRITICA'].map(
        (p) => this.filtered.filter((r) => r.priority === p).length,
      ),
      colors: ['#2e7d32', '#f57f17', '#e65100', '#c62828'],
    };
  }

  private drawDonut(canvas: HTMLCanvasElement | undefined, data: any): void {
    if (!canvas) return;
    const W = (canvas.width = canvas.offsetWidth || 260);
    const H = (canvas.height = 260);
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    const cx = W / 2,
      cy = H / 2,
      r = 90,
      ri = 52;
    const total = data.values.reduce((a: number, b: number) => a + b, 0);
    if (total === 0) {
      this.drawEmpty(ctx, W, H);
      return;
    }
    let start = -Math.PI / 2;
    data.values.forEach((v: number, i: number) => {
      if (v === 0) return;
      const slice = (v / total) * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + slice);
      ctx.closePath();
      ctx.fillStyle = data.colors[i];
      ctx.fill();
      const mid = start + slice / 2;
      const lx = cx + r * 0.7 * Math.cos(mid);
      const ly = cy + r * 0.7 * Math.sin(mid);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 13px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(v), lx, ly);
      start += slice;
    });
    ctx.beginPath();
    ctx.arc(cx, cy, ri, 0, 2 * Math.PI);
    ctx.fillStyle = '#fff';
    ctx.fill();
    ctx.fillStyle = '#0A142D';
    ctx.font = 'bold 22px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(total), cx, cy - 8);
    ctx.font = '11px DM Sans, sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('Total', cx, cy + 10);
    this.drawLegend(ctx, data, W, H);
  }

  private drawBars(canvas: HTMLCanvasElement | undefined, data: any): void {
    if (!canvas) return;
    const W = (canvas.width = canvas.offsetWidth || 320);
    const H = (canvas.height = 220);
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    const total = data.values.reduce((a: number, b: number) => a + b, 0);
    if (total === 0) {
      this.drawEmpty(ctx, W, H);
      return;
    }
    const pad = 40,
      barGap = 12;
    const n = data.labels.length;
    const barW = (W - pad * 2 - barGap * (n - 1)) / n;
    const maxV = Math.max(...data.values, 1);
    const chartH = H - pad - 30;
    data.values.forEach((v: number, i: number) => {
      const bh = (v / maxV) * chartH;
      const x = pad + i * (barW + barGap);
      const y = pad + chartH - bh;
      ctx.fillStyle = data.colors[i % data.colors.length];
      this.roundRect(ctx, x, y, barW, bh, 4);
      ctx.fillStyle = '#0A142D';
      ctx.font = 'bold 13px DM Sans, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(String(v), x + barW / 2, y - 2);
      ctx.fillStyle = '#555';
      ctx.font = '11px DM Sans, sans-serif';
      ctx.textBaseline = 'top';
      const label = data.labels[i].length > 8 ? data.labels[i].slice(0, 7) + '…' : data.labels[i];
      ctx.fillText(label, x + barW / 2, H - 24);
    });
    ctx.strokeStyle = '#e0d8cc';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad - 4, pad);
    ctx.lineTo(pad - 4, pad + chartH);
    ctx.lineTo(W - pad + 4, pad + chartH);
    ctx.stroke();
  }

  private drawLegend(ctx: CanvasRenderingContext2D, data: any, W: number, H: number): void {
    const y0 = H - 10;
    const itemW = W / data.labels.length;
    data.labels.forEach((lbl: string, i: number) => {
      const x = i * itemW + 8;
      ctx.fillStyle = data.colors[i];
      ctx.fillRect(x, y0 - 10, 10, 10);
      ctx.fillStyle = '#555';
      ctx.font = '10px DM Sans, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const short = lbl.length > 8 ? lbl.slice(0, 7) + '…' : lbl;
      ctx.fillText(short, x + 13, y0 - 5);
    });
  }

  private drawEmpty(ctx: CanvasRenderingContext2D, W: number, H: number): void {
    ctx.fillStyle = '#ccc';
    ctx.font = '13px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Sin datos', W / 2, H / 2);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number,
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  // ── Exports ──────────────────────────
  downloadCSV(): void {
    const headers = [
      '#',
      'Área',
      'Tipo',
      'Título',
      'Descripción',
      'Estado',
      'Prioridad',
      'Solicitante',
      'Fecha',
    ];
    const rows = this.filtered.map((r) => [
      r.id,
      r.areaName,
      r.typeName,
      r.title,
      `"${(r.description ?? '').replace(/"/g, '""')}"`,
      this.translateStatus(r.status),
      this.translatePriority(r.priority),
      r.createdByName,
      r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-CO') : '',
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `requerimientos_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  }

  downloadPDF(): void {
    const rows = this.filtered
      .map(
        (r) => `
      <tr>
        <td>#${r.id}</td>
        <td>${r.areaName}</td>
        <td>${r.typeName}</td>
        <td>${r.title}</td>
        <td><span class="s-${r.status}">${this.translateStatus(r.status)}</span></td>
        <td><span class="p-${r.priority}">${this.translatePriority(r.priority)}</span></td>
        <td>${r.createdByName}</td>
        <td>${r.createdAt ? new Date(r.createdAt).toLocaleDateString('es-CO') : ''}</td>
      </tr>`,
      )
      .join('');

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
    <title>Reporte Requerimientos</title>
    <style>
      body{font-family:'DM Sans',sans-serif;padding:32px;color:#0A142D;background:#EDE4D9;}
      h1{font-family:'Cormorant Garamond',serif;color:#0A142D;margin-bottom:4px;}
      .meta{font-size:12px;color:#888;margin-bottom:24px;}
      .kpis{display:flex;gap:12px;margin-bottom:24px;}
      .kpi{background:#fff;border-radius:8px;padding:12px 20px;text-align:center;border-left:4px solid #CC521B;}
      .kpi strong{display:block;font-size:24px;} .kpi span{font-size:11px;color:#888;}
      table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;font-size:12px;}
      th{background:#0A142D;color:#CCBBA7;padding:9px 10px;text-align:left;}
      td{padding:8px 10px;border-bottom:1px solid #f0ebe3;}
      .s-PENDING{background:#fff8e1;color:#e65100;padding:2px 7px;border-radius:20px;}
      .s-IN_PROGRESS{background:#e3f2fd;color:#1565c0;padding:2px 7px;border-radius:20px;}
      .s-COMPLETED{background:#e8f5e9;color:#2e7d32;padding:2px 7px;border-radius:20px;}
      .s-REJECTED{background:#fce4ec;color:#c62828;padding:2px 7px;border-radius:20px;}
      .p-BAJA{color:#2e7d32;font-weight:600;} .p-MEDIA{color:#f57f17;font-weight:600;}
      .p-ALTA{color:#e65100;font-weight:600;} .p-CRITICA{color:#c62828;font-weight:600;}
    </style></head><body>
    <h1>Reporte de Requerimientos</h1>
    <div class="meta">ProScience Lab S.A.S. · Generado el
      ${new Date().toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' })}
    </div>
    <div class="kpis">
      <div class="kpi"><strong>${this.total}</strong><span>Total</span></div>
      <div class="kpi"><strong>${this.pendientes}</strong><span>Pendientes</span></div>
      <div class="kpi"><strong>${this.enProceso}</strong><span>En proceso</span></div>
      <div class="kpi"><strong>${this.completados}</strong><span>Completados</span></div>
    </div>
    <table><thead><tr>
      <th>#</th><th>Área</th><th>Tipo</th><th>Título</th>
      <th>Estado</th><th>Prioridad</th><th>Solicitante</th><th>Fecha</th>
    </tr></thead><tbody>${rows}</tbody></table>
    </body></html>`;

    const win = window.open('', '_blank');
    win?.document.write(html);
    win?.document.close();
    setTimeout(() => win?.print(), 500);
  }
}
