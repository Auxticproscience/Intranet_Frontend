import { Component, Input, OnChanges, AfterViewInit, ViewChild, ElementRef, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FixedAssetResponse } from '../../core/models/fixed-asset.model';

@Component({
  selector: 'app-assets-report',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="report-wrap">
      <div class="report-header">
        <div>
          <h2>📊 Reportes de Activos Fijos</h2>
          <p class="subtitle">{{ assets.length }} activos · Valor total: {{ formatCurrency(totalValue) }}</p>
        </div>
        <div class="export-btns">
          <button class="btn-export csv" (click)="downloadCSV()">⬇️ CSV</button>
          <button class="btn-export pdf" (click)="downloadPDF()">🖨️ PDF</button>
        </div>
      </div>

      <!-- KPIs -->
      <div class="kpis-row">
        <div class="kpi-card"><span class="kpi-n">{{ assets.length }}</span><span class="kpi-l">Total activos</span></div>
        <div class="kpi-card green"><span class="kpi-n">{{ countStatus('activo') }}</span><span class="kpi-l">Activos</span></div>
        <div class="kpi-card orange"><span class="kpi-n">{{ countStatus('en_mantenimiento') }}</span><span class="kpi-l">Mantenimiento</span></div>
        <div class="kpi-card red"><span class="kpi-n">{{ countStatus('dado_de_baja') }}</span><span class="kpi-l">Dados de baja</span></div>
        <div class="kpi-card blue"><span class="kpi-n small">{{ formatCurrency(totalValue) }}</span><span class="kpi-l">Valor inventario</span></div>
      </div>

      <!-- Tipo de vista -->
      <div class="chart-tabs">
        <button class="chart-tab" [class.active]="chartView==='categoria'" (click)="setView('categoria')">Por Categoría</button>
        <button class="chart-tab" [class.active]="chartView==='sede'"     (click)="setView('sede')">Por Sede</button>
        <button class="chart-tab" [class.active]="chartView==='estado'"   (click)="setView('estado')">Por Estado</button>
        <button class="chart-tab" [class.active]="chartView==='valor'"    (click)="setView('valor')">Valor por Sede</button>
      </div>

      <!-- Gráficas donut + barras -->
      <div class="charts-row">
        <div class="chart-box">
          <h4>Distribución — Donut</h4>
          <canvas #donutCanvas></canvas>
        </div>
        <div class="chart-box wide">
          <h4>Distribución — Barras</h4>
          <canvas #barCanvas></canvas>
        </div>
      </div>

      <!-- Tabla resumen -->
      <div class="summary-table-wrap">
        <h4>Detalle por {{ chartView }}</h4>
        <table class="summary-table">
          <thead>
            <tr><th>{{ chartView | titlecase }}</th><th>Cantidad</th><th>% del total</th><th>Valor (COP)</th></tr>
          </thead>
          <tbody>
            @for (row of summaryRows(); track row.label) {
              <tr>
                <td><span class="dot" [style.background]="row.color"></span> {{ row.label }}</td>
                <td><strong>{{ row.count }}</strong></td>
                <td>{{ row.pct }}%</td>
                <td>{{ formatCurrency(row.value) }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .report-wrap { padding: 0 0 32px; }
    .report-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;
      h2 { margin: 0; font-family: var(--font-title); color: var(--color-primary); &::after{display:none;} }
      .subtitle { color: var(--color-text-soft); font-size: 13px; margin: 4px 0 0; }
      .export-btns { display: flex; gap: 8px; }
      .btn-export { border: none; border-radius: 8px; padding: 9px 16px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: var(--font-body);
        &.csv { background: #e8f5e9; color: #2e7d32; &:hover { background: #c8e6c9; } }
        &.pdf { background: var(--color-accent); color: #fff; &:hover { background: #b34415; } }
      }
    }
    .kpis-row { display: grid; grid-template-columns: repeat(5,1fr); gap: 12px; margin-bottom: 24px; }
    .kpi-card { background:#fff; border:1px solid var(--color-border); border-radius:12px; padding:16px; text-align:center; border-top:4px solid var(--color-beige);
      .kpi-n { display:block; font-size:28px; font-weight:700; color:var(--color-primary); }
      .kpi-n.small { font-size:13px; margin-top:4px; }
      .kpi-l { font-size:12px; color:var(--color-text-soft); }
      &.green { border-top-color:#4caf50; .kpi-n{color:#2e7d32;} }
      &.orange { border-top-color:var(--color-accent); .kpi-n{color:var(--color-accent);} }
      &.red { border-top-color:var(--color-brown); .kpi-n{color:var(--color-brown);} }
      &.blue { border-top-color:var(--color-primary); .kpi-n{color:var(--color-primary);} }
    }
    .chart-tabs { display:flex; gap:8px; margin-bottom:16px; }
    .chart-tab { border:1.5px solid var(--color-border); background:#fafafa; border-radius:8px; padding:7px 16px; cursor:pointer; font-size:13px; font-family:var(--font-body);
      &.active { background:var(--color-primary); color:#fff; border-color:var(--color-primary); font-weight:600; }
      &:not(.active):hover { background:var(--color-bg); }
    }
    .charts-row { display:grid; grid-template-columns:280px 1fr; gap:16px; margin-bottom:24px; }
    .chart-box { background:#fff; border:1px solid var(--color-border); border-radius:12px; padding:16px;
      h4 { font-family:var(--font-title); color:var(--color-primary); margin-bottom:12px; font-size:14px; text-align:center; &::after{display:none;} }
      canvas { width:100%; display:block; }
      &.wide { flex:1; }
    }
    .summary-table-wrap { background:#fff; border:1px solid var(--color-border); border-radius:12px; overflow:hidden;
      h4 { font-family:var(--font-title); color:var(--color-primary); padding:14px 20px; border-bottom:1px solid #f0ebe3; margin:0; font-size:15px; text-transform:capitalize; &::after{display:none;} }
    }
    .summary-table { width:100%; border-collapse:collapse; font-size:13px;
      th { background:var(--color-primary); color:var(--color-beige); padding:10px 16px; text-align:left; font-size:11px; letter-spacing:0.05em; }
      td { padding:10px 16px; border-bottom:1px solid #f5f0ea; }
      tr:last-child td { border-bottom:none; }
      tr:hover td { background:#fdf9f5; }
    }
    .dot { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:8px; vertical-align:middle; }
  `]
})
export class AssetsReportComponent implements OnChanges, AfterViewInit {
  @Input() assets: FixedAssetResponse[] = [];
  @ViewChild('donutCanvas') donutCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('barCanvas')   barCanvas!:   ElementRef<HTMLCanvasElement>;

  chartView = 'categoria';
  private ready = false;

  readonly PALETTE = ['#0A142D','#CC521B','#90574D','#94B6EF','#CCBBA7','#4caf50','#ff9800','#9c27b0','#2196f3','#f44336','#00bcd4'];

  get totalValue() { return this.assets.reduce((s,a) => s + (a.acquisitionValue ?? 0), 0); }

  countStatus(s: string) { return this.assets.filter(a => a.status === s).length; }

  setView(v: string) { this.chartView = v; this.draw(); }

  ngAfterViewInit() { this.ready = true; setTimeout(() => this.draw(), 100); }
  ngOnChanges(c: SimpleChanges) { if (this.ready) setTimeout(() => this.draw(), 50); }

  private getData() {
    if (this.chartView === 'categoria') {
      const keys = [...new Set(this.assets.map(a => a.category))];
      return {
        labels: keys,
        values: keys.map(k => this.assets.filter(a => a.category === k).length),
        valueAmounts: keys.map(k => this.assets.filter(a => a.category === k).reduce((s, a) => s + (a.acquisitionValue ?? 0), 0))
      };
    }
    if (this.chartView === 'sede' || this.chartView === 'valor') {
      const keys = [...new Set(this.assets.map(a => a.sede).filter(Boolean))];
      return {
        labels: keys,
        values: keys.map(k => this.chartView === 'valor'
          ? this.assets.filter(a => a.sede === k).reduce((s, a) => s + (a.acquisitionValue ?? 0), 0)
          : this.assets.filter(a => a.sede === k).length
        ),
        valueAmounts: keys.map(k => this.assets.filter(a => a.sede === k).reduce((s, a) => s + (a.acquisitionValue ?? 0), 0))
      };
    }
    const keys = ['activo', 'en_mantenimiento', 'dado_de_baja', 'disponible'];
    const lbls = ['Activo', 'Mantenimiento', 'Dado de baja', 'Disponible'];
    return {
      labels: lbls,
      values: keys.map(k => this.assets.filter(a => a.status === k).length),
      valueAmounts: keys.map(k => this.assets.filter(a => a.status === k).reduce((s, a) => s + (a.acquisitionValue ?? 0), 0))
    };
  }

  summaryRows() {
    const d = this.getData();
    const total = d.values.reduce((a,b) => a+b, 0) || 1;
    return d.labels.map((l,i) => ({
      label: l, count: d.values[i],
      pct: Math.round(d.values[i]/total*100),
      value: d.valueAmounts[i],
      color: this.PALETTE[i % this.PALETTE.length]
    }));
  }

  private draw() {
    const d = this.getData();
    this.drawDonut(this.donutCanvas?.nativeElement, d.labels, d.values);
    this.drawBars(this.barCanvas?.nativeElement,   d.labels, d.values);
  }

  private drawDonut(c: HTMLCanvasElement|undefined, labels: string[], values: number[]) {
    if (!c) return;
    const W = c.width = c.offsetWidth || 240;
    const H = c.height = 260;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0,0,W,H);
    const total = values.reduce((a,b)=>a+b,0);
    if (!total) { ctx.fillStyle='#ccc'; ctx.font='13px sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText('Sin datos',W/2,H/2); return; }
    const cx=W/2, cy=120, r=90, ri=55;
    let start = -Math.PI/2;
    values.forEach((v,i) => {
      if (!v) return;
      const slice = (v/total)*2*Math.PI;
      ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,r,start,start+slice); ctx.closePath();
      ctx.fillStyle = this.PALETTE[i%this.PALETTE.length]; ctx.fill();
      const mid=start+slice/2;
      ctx.fillStyle='#fff'; ctx.font='bold 12px DM Sans,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
      if (v>0) ctx.fillText(String(v), cx+(r*.7)*Math.cos(mid), cy+(r*.7)*Math.sin(mid));
      start+=slice;
    });
    ctx.beginPath(); ctx.arc(cx,cy,ri,0,2*Math.PI); ctx.fillStyle='#fff'; ctx.fill();
    ctx.fillStyle='#0A142D'; ctx.font='bold 20px DM Sans,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='middle';
    ctx.fillText(String(total), cx, cy-7);
    ctx.font='11px DM Sans,sans-serif'; ctx.fillStyle='#888'; ctx.fillText('Total', cx, cy+9);
    // Legend
    const itemW = W / Math.min(labels.length, 4);
    labels.forEach((l,i) => {
      const row = Math.floor(i/4), col = i%4;
      const lx = col*itemW+8, ly = H-28+row*14;
      ctx.fillStyle=this.PALETTE[i%this.PALETTE.length]; ctx.fillRect(lx,ly,9,9);
      ctx.fillStyle='#555'; ctx.font='10px sans-serif'; ctx.textAlign='left'; ctx.textBaseline='middle';
      const short = l.length>9 ? l.slice(0,8)+'…' : l;
      ctx.fillText(short, lx+12, ly+4);
    });
  }

  private drawBars(c: HTMLCanvasElement|undefined, labels: string[], values: number[]) {
    if (!c) return;
    const W = c.width = c.offsetWidth || 400;
    const H = c.height = 260;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0,0,W,H);
    const pad=40, gap=10, n=labels.length;
    const bw=(W-pad*2-gap*(n-1))/n;
    const maxV=Math.max(...values,1);
    const chartH=H-pad-30;
    values.forEach((v,i) => {
      const bh=(v/maxV)*chartH;
      const x=pad+i*(bw+gap), y=pad+chartH-bh;
      ctx.fillStyle=this.PALETTE[i%this.PALETTE.length];
      ctx.beginPath(); ctx.roundRect(x,y,bw,bh,4); ctx.fill();
      ctx.fillStyle='#0A142D'; ctx.font='bold 12px DM Sans,sans-serif'; ctx.textAlign='center'; ctx.textBaseline='bottom';
      ctx.fillText(String(v), x+bw/2, y-2);
      ctx.fillStyle='#555'; ctx.font='11px DM Sans,sans-serif'; ctx.textBaseline='top';
      const lbl=labels[i].length>8?labels[i].slice(0,7)+'…':labels[i];
      ctx.fillText(lbl, x+bw/2, H-24);
    });
    ctx.strokeStyle='#e0d8cc'; ctx.lineWidth=1; ctx.beginPath();
    ctx.moveTo(pad-4,pad); ctx.lineTo(pad-4,pad+chartH); ctx.lineTo(W-pad+4,pad+chartH); ctx.stroke();
  }

  formatCurrency(v?: number): string {
    if (!v) return '—';
    return new Intl.NumberFormat('es-CO',{style:'currency',currency:'COP',maximumFractionDigits:0}).format(v);
  }

  downloadCSV() {
    const headers = ['Código','Categoría','Marca','Serial','Sede','Área','Asignado a','Estado','Valor','F.Adquisición'];
    const rows = this.assets.map(a => [
      a.code, a.category, a.brand ?? '', a.serial ?? '',
      a.sede, a.areaName ?? '', a.assignedToFullName ?? '',
      a.status, a.acquisitionValue ?? 0, a.acquisitionDate
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const el = document.createElement('a');
    el.href = URL.createObjectURL(new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' }));
    el.download = `activos_fijos_${new Date().toISOString().split('T')[0]}.csv`;
    el.click();
  }

  downloadPDF() {
  const rows = this.assets.map(a => `
    <tr><td>${a.code}</td><td>${a.category}</td><td>${a.brand ?? '—'}</td>
    <td>${a.serial ?? '—'}</td><td>${a.sede}</td>
    <td>${a.assignedToFullName ?? '—'}</td>
    <td><span class="s-${a.status}">${a.status}</span></td>
    <td>${this.formatCurrency(a.acquisitionValue)}</td></tr>`).join('');
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Reporte Activos Fijos</title>
    <style>body{font-family:'DM Sans',sans-serif;padding:32px;color:#0A142D;background:#EDE4D9;}
    h1{font-family:'Cormorant Garamond',serif;font-size:26px;margin-bottom:4px;}
    .meta{font-size:12px;color:#888;margin-bottom:20px;}
    .kpis{display:flex;gap:10px;margin-bottom:20px;}
    .kpi{background:#fff;border-radius:8px;padding:10px 16px;text-align:center;border-left:4px solid #CC521B;}
    .kpi strong{display:block;font-size:20px;} .kpi span{font-size:11px;color:#888;}
    table{width:100%;border-collapse:collapse;background:#fff;font-size:12px;}
    th{background:#0A142D;color:#CCBBA7;padding:8px 10px;text-align:left;}
    td{padding:7px 10px;border-bottom:1px solid #f0ebe3;}
    .s-activo{color:#2e7d32;font-weight:600;} .s-en_mantenimiento{color:#e65100;font-weight:600;}
    .s-dado_de_baja{color:#c62828;font-weight:600;}
    @media print{body{background:#fff;padding:0;}}</style></head><body>
    <h1>Reporte de Activos Fijos</h1>
    <div class="meta">ProScience Lab S.A.S. · ${new Date().toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'})}</div>
    <div class="kpis">
      <div class="kpi"><strong>${this.assets.length}</strong><span>Total activos</span></div>
      <div class="kpi"><strong>${this.countStatus('activo')}</strong><span>Activos</span></div>
      <div class="kpi"><strong>${this.countStatus('en_mantenimiento')}</strong><span>Mantenimiento</span></div>
      <div class="kpi"><strong>${this.formatCurrency(this.totalValue)}</strong><span>Valor total</span></div>
    </div>
    <table><thead><tr><th>Código</th><th>Categoría</th><th>Marca</th><th>Serial</th><th>Sede</th><th>Asignado a</th><th>Estado</th><th>Valor</th></tr></thead>
    <tbody>${rows}</tbody></table></body></html>`;
    const win = window.open('','_blank');
    win?.document.write(html); win?.document.close();
    setTimeout(()=>win?.print(),500);
  }
}
