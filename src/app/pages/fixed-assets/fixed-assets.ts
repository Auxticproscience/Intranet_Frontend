import { FixedAssetRequest, FixedAssetResponse } from '../../core/models/fixed-asset.model';
import { FixedAssetsService } from '../../core/services/fixed-asset.service';
import { UserService } from '../../core/services/user.service';
import { AreaService } from '../../core/services/area.service';
import { UserA } from '../../core/models/user-admin.model';
import { AreaResponse } from '../../core/models/area.model';
import { CountByStatusPipe } from './count-by-status.pipe';
import { AssetsReportComponent } from './assets-report.component';
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SITES } from '../../core/constants/sites.constants';

interface AssetForm extends Partial<FixedAssetRequest> {
  ramType?: string;
  storageType?: string;
  hasLicenseWindows?: boolean;
  hasLicenseOffice?: boolean;
  acquisitionValueStr?: string;
}

interface EmployeeOption {
  id: string;
  name: string;
  position: string;
  sede: string;
}

@Component({
  selector: 'app-fixed-assets',
  standalone: true,
  templateUrl: './fixed-assets.html',
  styleUrls: ['./fixed-assets.scss'],
  imports: [CommonModule, FormsModule, DatePipe, CountByStatusPipe, AssetsReportComponent],
})
export class FixedAssetsComponent implements OnInit {
  // ── Estado general ──────────────────────────────
  assets: FixedAssetResponse[] = [];
  filteredAssets: FixedAssetResponse[] = [];
  loading = false;
  error = '';

  // ── Tabs ────────────────────────────────────────
  showReports = false;

  // ── Formulario creación ─────────────────────────
  showForm = false;
  newAsset: AssetForm = this.emptyForm();

  // ── Modal detalle / edición ─────────────────────
  previewAsset: FixedAssetResponse | null = null;
  editMode = false;
  editForm: AssetForm = {};

  // ── Auth ────────────────────────────────────────
  currentUserId = '';
  isAdmin = false;
  currentUserFullName = '';
  currentUserPosition = '';

  // ── Búsqueda empleados ──────────────────────────
  employeeSearch = '';
  employeeResults: EmployeeOption[] = [];
  showEmployeeDropdown = false;
  private selectedEmployeeId: string | null = null;
  private allUsers: UserA[] = [];

  // ── Áreas ───────────────────────────────────────
  areaList: AreaResponse[] = [];

  // ── Filtros ─────────────────────────────────────
  searchText = '';
  filterSede = '';
  filterCategory = '';
  filterStatus = '';

  // ── Catálogos ────────────────────────────────────
  readonly categories = [
    'Portátil',
    'PC de Escritorio',
    'PC Mini / All-in-One',
    'Monitor',
    'Impresora',
    'Teléfono IP',
    'Teléfono celular',
    'Servidor',
    'Switch / Router',
    'UPS',
    'Proyector',
    'Tablet',
    'CCTV',
    'Otro',
  ];

  readonly sedes = SITES;

  get totalValue(): number {
    return this.assets.reduce((sum, a) => sum + (a.acquisitionValue ?? 0), 0);
  }

  constructor(
    private fixedAssetsService: FixedAssetsService,
    private userService: UserService,
    private areaService: AreaService,
    protected cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
    this.loadAll();
    this.loadUsers();
    this.loadAreas();
  }

  loadCurrentUser(): void {
    this.userService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUserId = user.id;
        this.currentUserFullName = `${user.firstName} ${user.lastName}`;
        this.currentUserPosition = user.position ?? 'Director TIC';
        this.isAdmin = !!(user.roles?.includes('ADMIN') || user.roles?.includes('SUPER_ADMIN'));
      },
      error: (err) => console.error('Error cargando usuario actual:', err),
    });
  }

  private loadUsers(): void {
    this.userService.getAllAdminUsers().subscribe({
      next: (users) => (this.allUsers = users),
      error: (err) => console.error('Error cargando usuarios:', err),
    });
  }

  private loadAreas(): void {
    this.areaService.findAll().subscribe({
      next: (areas) => (this.areaList = areas),
      error: (err) => console.error('Error cargando áreas:', err),
    });
  }

  loadAll(): void {
    this.loading = true;
    this.fixedAssetsService.getAll().subscribe({
      next: (data) => {
        this.assets = data;
        this.filteredAssets = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Error al cargar activos fijos';
        this.loading = false;
        console.error(err);
      },
    });
  }

  toggleForm(): void {
    this.showForm = !this.showForm;
    if (!this.showForm) this.resetForm();
  }

  saveAsset(): void {
    const payload = this.buildPayload();
    this.fixedAssetsService.create(payload).subscribe({
      next: (nuevo) => {
        this.assets = [nuevo, ...this.assets];
        this.filterAssets();
        this.toggleForm();
      },
      error: (err) => console.error('Error al guardar activo:', err),
    });
  }

  private buildPayload(): FixedAssetRequest {
    const ram = [this.newAsset.ram, this.newAsset.ramType].filter(Boolean).join(' ');
    const storage = [this.newAsset.storage, this.newAsset.storageType].filter(Boolean).join(' ');
    const toDateTime = (d?: string | null) => (d ? `${d}T00:00:00` : null);
    const parseValue = (s?: string): number | null => {
      if (!s) return null;
      const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
      return isNaN(n) ? null : n;
    };

    return {
      code: '',
      name: this.newAsset.name ?? '',
      category: this.newAsset.category ?? '',
      brand: this.newAsset.brand ?? '',
      model: this.newAsset.model ?? '',
      serial: this.newAsset.serial ?? '',
      location: this.newAsset.location ?? '',
      sede: this.newAsset.sede ?? '',
      areaId: this.newAsset.areaId ?? null,
      assignedToId: this.selectedEmployeeId,
      status: this.newAsset.status ?? 'activo',
      acquisitionDate: toDateTime(this.newAsset.acquisitionDate),
      acquisitionValue: parseValue(this.newAsset.acquisitionValueStr),
      description: this.newAsset.description ?? '',
      processor: this.newAsset.processor ?? '',
      ram,
      storage,
      os: this.newAsset.os ?? '',
      ip: this.newAsset.ip ?? '',
      mac: this.newAsset.mac ?? '',
      warrantyDate: toDateTime(this.newAsset.warrantyDate),
      actaFirmada: false,
      actaDate: null,
    };
  }

  private resetForm(): void {
    this.newAsset = this.emptyForm();
    this.employeeSearch = '';
    this.selectedEmployeeId = null;
    this.showEmployeeDropdown = false;
    this.employeeResults = [];
  }

  private emptyForm(): AssetForm {
    return {
      name: '',
      category: '',
      brand: '',
      model: '',
      serial: '',
      location: '',
      sede: '',
      areaId: null,
      status: 'activo',
      description: '',
      processor: '',
      ram: '',
      ramType: '',
      storage: '',
      storageType: '',
      os: '',
      ip: '',
      mac: '',
      acquisitionValueStr: '',
      acquisitionDate: '',
      warrantyDate: '',
      hasLicenseWindows: false,
      hasLicenseOffice: false,
    };
  }

  // ══════════════════════════════════════════════════
  // Modal — Ver detalle
  // ══════════════════════════════════════════════════

  openPreview(asset: FixedAssetResponse): void {
    this.previewAsset = asset;
    this.editMode = false;
    this.editForm = {};
  }

  closePreview(): void {
    this.previewAsset = null;
    this.editMode = false;
    this.editForm = {};
  }

  // ══════════════════════════════════════════════════
  // Modal — Edición (solo ADMIN)
  // ══════════════════════════════════════════════════

  openEditMode(): void {
    if (!this.previewAsset) return;
    const a = this.previewAsset;

    this.editForm = {
      name: a.name,
      category: a.category,
      brand: a.brand,
      model: a.model,
      serial: a.serial,
      location: a.location,
      sede: a.sede,
      areaId: a.areaId ?? null,
      status: a.status,
      description: a.description,
      processor: a.processor,
      ram: a.ram?.split(' ')[0] ?? '',
      ramType: a.ram?.split(' ')[1] ?? '',
      storage: a.storage?.split(' ')[0] ?? '',
      storageType: a.storage?.split(' ')[1] ?? '',
      os: a.os,
      ip: a.ip,
      mac: a.mac,
      acquisitionValueStr: a.acquisitionValue?.toString() ?? '',
      acquisitionDate: a.acquisitionDate?.split('T')[0] ?? '',
      warrantyDate: a.warrantyDate?.split('T')[0] ?? '',
    };

    // Pre-cargar empleado asignado en el buscador
    this.employeeSearch = a.assignedToFullName ?? '';
    this.selectedEmployeeId = a.assignedToId ?? null;
    this.editMode = true;
  }

  closeEditMode(): void {
    this.editMode = false;
    this.editForm = {};
    this.employeeSearch = '';
    this.selectedEmployeeId = null;
  }

  saveEdit(): void {
    if (!this.previewAsset) return;

    const ram = [this.editForm.ram, this.editForm.ramType].filter(Boolean).join(' ');
    const storage = [this.editForm.storage, this.editForm.storageType].filter(Boolean).join(' ');
    const toDateTime = (d?: string | null) => (d ? `${d}T00:00:00` : null);
    const parseValue = (s?: string): number | null => {
      if (!s) return null;
      const n = parseFloat(s.replace(/\./g, '').replace(',', '.'));
      return isNaN(n) ? null : n;
    };

    const payload: FixedAssetRequest = {
      code: this.previewAsset.code ?? '',
      name: this.editForm.name ?? '',
      category: this.editForm.category ?? '',
      brand: this.editForm.brand ?? '',
      model: this.editForm.model ?? '',
      serial: this.editForm.serial ?? '',
      location: this.editForm.location ?? '',
      sede: this.editForm.sede ?? '',
      areaId: this.editForm.areaId ?? null,
      assignedToId: this.selectedEmployeeId,
      status: this.editForm.status ?? 'activo',
      acquisitionDate: toDateTime(this.editForm.acquisitionDate),
      acquisitionValue: parseValue(this.editForm.acquisitionValueStr),
      description: this.editForm.description ?? '',
      processor: this.editForm.processor ?? '',
      ram,
      storage,
      os: this.editForm.os ?? '',
      ip: this.editForm.ip ?? '',
      mac: this.editForm.mac ?? '',
      warrantyDate: toDateTime(this.editForm.warrantyDate),
      actaFirmada: this.previewAsset.actaFirmada ?? false,
      actaDate: null,
    };

    this.fixedAssetsService.update(this.previewAsset.id, payload).subscribe({
      next: (updated) => {
        const idx = this.assets.findIndex((a) => a.id === updated.id);
        if (idx !== -1) this.assets[idx] = updated;
        this.filterAssets();
        this.previewAsset = updated;
        this.closeEditMode();
      },
      error: (err) => console.error('Error actualizando activo:', err),
    });
  }

  // ══════════════════════════════════════════════════
  // Búsqueda empleados
  // ══════════════════════════════════════════════════

  searchEmployee(query: string): void {
    this.employeeSearch = query;
    this.selectedEmployeeId = null;

    if (query.length < 2) {
      this.showEmployeeDropdown = false;
      this.employeeResults = [];
      return;
    }

    const q = query.toLowerCase();
    this.employeeResults = this.allUsers
      .filter(
        (u) =>
          `${u.firstName} ${u.lastName}`.toLowerCase().includes(q) ||
          u.position?.toLowerCase().includes(q),
      )
      .slice(0, 8)
      .map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        position: u.position ?? '',
        sede: u.sede ?? '',
      }));

    this.showEmployeeDropdown = this.employeeResults.length > 0;
  }

  selectEmployee(emp: EmployeeOption): void {
    this.selectedEmployeeId = emp.id;
    this.employeeSearch = emp.name;
    this.showEmployeeDropdown = false;
  }

  clearEmployee(): void {
    this.selectedEmployeeId = null;
    this.employeeSearch = '';
    this.showEmployeeDropdown = false;
  }

  // ══════════════════════════════════════════════════
  // Filtros
  // ══════════════════════════════════════════════════

  filterAssets(): void {
    const q = this.searchText.toLowerCase();
    this.filteredAssets = this.assets.filter((a) => {
      const matchSearch =
        !q ||
        [a.name, a.code, a.serial, a.assignedToFullName, a.brand].some((val) =>
          val?.toLowerCase().includes(q),
        );

      const matchSede = !this.filterSede || a.sede === this.filterSede;
      const matchCategory = !this.filterCategory || a.category === this.filterCategory;
      const matchStatus = !this.filterStatus || a.status === this.filterStatus;

      return matchSearch && matchSede && matchCategory && matchStatus;
    });
  }

  // ══════════════════════════════════════════════════
  // Helpers
  // ══════════════════════════════════════════════════

  formatCurrency(value: number | null | undefined): string {
    if (value == null) return '—';
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0,
    }).format(value);
  }

  getCategoryIcon(category: string): string {
    const icons: Record<string, string> = {
      Portátil: '💻',
      'PC de Escritorio': '🖥️',
      'PC Mini / All-in-One': '🖥️',
      Monitor: '🖥️',
      Impresora: '🖨️',
      'Teléfono IP': '☎️',
      'Teléfono celular': '📱',
      Servidor: '🗄️',
      'Switch / Router': '🔌',
      UPS: '🔋',
      Proyector: '📽️',
      Tablet: '📱',
      CCTV: '📹',
      Otro: '📦',
    };
    return icons[category] ?? '📦';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      activo: 'Activo',
      disponible: 'Disponible',
      en_mantenimiento: 'Mantenimiento',
      dado_de_baja: 'Dado de baja',
    };
    return labels[status] ?? status;
  }

  getSedeCss(sede: string): string {
    return sede?.toLowerCase().replace(/\s+/g, '-') ?? '';
  }

  generateActa(asset: FixedAssetResponse): void {
    const logoUrl = 'assets/images/Logo.png';

    const today = new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });

    const specs = [
      asset.processor ? `Procesador: ${asset.processor}` : null,
      asset.ram ? `RAM: ${asset.ram}` : null,
      asset.storage ? `Almacenamiento: ${asset.storage}` : null,
      asset.os ? `S.O.: ${asset.os}` : null,
      asset.ip ? `IP: ${asset.ip}` : null,
      asset.mac ? `MAC: ${asset.mac}` : null,
    ]
      .filter(Boolean)
      .join(' &nbsp;|&nbsp; ');

    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8"/>
      <title>Acta de Entrega - ${asset.code ?? asset.name}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
          font-family: 'Georgia', serif;
          font-size: 13px;
          color: #1a1a1a;
          background: #fff;
          padding: 32px 48px;
          max-width: 800px;
          margin: 0 auto;
        }

        /* ── Encabezado ── */
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #8b6c42;
          padding-bottom: 14px;
          margin-bottom: 18px;
        }

        .header-title h1 {
          font-size: 19.5px;
          font-weight: bold;
          color: #1a1a1a;
          letter-spacing: 0.3px;
        }

        .header-title .acta-date {
          font-size: 12.5px;
          color: #555;
          margin-top: 4px;
        }

        .header img {
          height: 60px;
          object-fit: contain;
        }

        /* ── Subtítulo ── */
        .subtitle {
          margin-bottom: 14px;
          font-size: 13px;
        }

        .subtitle strong {
          font-size: 14px;
        }

        /* ── Tabla de datos ── */
        table.data-table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 14px;
          font-size: 12.5px;
        }

        table.data-table td {
          border: 1px solid #aaa;
          padding: 6px 10px;
          vertical-align: top;
        }

        table.data-table td.label {
          font-weight: bold;
          background: #f5f0e8;
          width: 160px;
          white-space: nowrap;
        }

        /* ── Especificaciones ── */
        .specs-row {
          background: #f9f6f0;
          border: 1px solid #aaa;
          padding: 6px 10px;
          font-size: 12px;
          color: #333;
          margin-bottom: 14px;
          border-radius: 2px;
        }

        /* ── Observaciones ── */
        .obs-row {
          margin-bottom: 14px;
          font-size: 12.5px;
        }

        .obs-row strong { font-size: 13px; }

        /* ── Texto legal ── */
        .legal {
          font-size: 12px;
          line-height: 1.65;
          color: #333;
          text-align: justify;
          margin-bottom: 12px;
          padding: 10px 14px;
          border-left: 3px solid #8b6c42;
          background: #fdfaf5;
        }

        /* ── Firmas ── */
        .firmas {
          display: flex;
          justify-content: space-between;
          margin-top: 32px;
          gap: 40px;
        }

        .firma-block {
          flex: 1;
          text-align: center;
        }

        .firma-line {
          border-top: 1px solid #333;
          margin-bottom: 6px;
          margin-top: 40px;
        }

        .firma-block .nombre {
          font-weight: bold;
          font-size: 12.5px;
          text-transform: uppercase;
        }

        .firma-block .cargo {
          font-size: 12px;
          color: #444;
        }

        .firma-block .cc-line {
          margin-top: 10px;
          border-top: 1px solid #333;
          padding-top: 4px;
          font-size: 11.5px;
          color: #555;
          text-align: left;
        }

        @media print {
          body { padding: 20px 32px; }
          button { display: none !important; }
        }
      </style>
    </head>
    <body>

      <!-- Encabezado -->
      <div class="header">
        <div class="header-title">
          <h1>Acta de entrega activo fijo ${asset.areaName ?? 'TIC'} No. ${asset.code}</h1>
          <div class="acta-date">${today}</div>
        </div>
        <img src="${logoUrl}" alt="Logo empresa" />
      </div>

      <!-- Subtítulo -->
      <p class="subtitle">
        Se hace entrega de <strong>${asset.category ?? 'Activo'}</strong> con las siguientes características:
      </p>

      <!-- Tabla datos -->
      <table class="data-table">
        <tr>
          <td class="label">Marca y modelo:</td>
          <td>${[asset.brand, asset.model].filter(Boolean).join(' / ') || '—'}</td>
          <td class="label">Serial:</td>
          <td>${asset.serial || '—'}</td>
        </tr>
        <tr>
          <td class="label">Código interno:</td>
          <td>${asset.code || '—'}</td>
          <td class="label">Activo fijo:</td>
          <td>${asset.code || '—'}</td>
        </tr>
        ${
          asset.os || asset.processor
            ? `
        <tr>
          <td class="label">Software instalado:</td>
          <td colspan="3">${asset.os ?? '—'}</td>
        </tr>`
            : ''
        }
      </table>

      ${specs ? `<div class="specs-row">⚙️ Especificaciones: ${specs}</div>` : ''}

      <!-- Observaciones -->
      <div class="obs-row">
        <strong>Observaciones:</strong> ${asset.description || 'Ninguna'}
      </div>

      <!-- Texto legal -->
      <div class="legal">
        El funcionario que recibe el activo es responsable de reportar cualquier falla o daño al área de TIC,
        además de seguir las siguientes recomendaciones de uso:
        • No realizar conexiones eléctricas o de red no autorizadas.
        • No poner objetos que puedan derramar líquido sobre el activo.
        • No golpear o dejar caer el activo.
        • No prestar el activo a personas no autorizadas.
        • No poner objetos pesados sobre el activo.
        • En caso de robo, el funcionario deberá informar y anexar copia del respectivo denuncio.
        • En caso de daño o pérdida el funcionario asumirá el valor total del arreglo o reemplazo del mismo.
        • El equipo se entrega nuevo en caja con sus respectivos accesorios originales.
        • No está permitido instalar programas o software que no correspondan a las funciones propias del cargo.
        <br/><br/>
        Observaciones: Al momento de recibir el activo aquí especificado se realizaron las pruebas de
        funcionamiento, se entrega funcional y en buen estado. De acuerdo a lo anterior se hace constar que
        el activo se encuentra en condiciones adecuadas para recibirlo, con las siguientes salvedades:
      </div>

      <div class="legal">
        Adicionalmente deberá tener en cuenta:
        • No introducir o conectar otros equipos sin autorización que causen daños al software o hardware.
        • No modificar la configuración del software.
        • Apagar el equipo al terminar la jornada de trabajo.
      </div>

      <!-- Firmas -->
      <div class="firmas">
        <div class="firma-block">
          <div style="text-align:left; font-size:11px; margin-bottom:4px;">Hace entrega,</div>
          <div class="firma-line"></div>
          <div class="nombre">Luis Velez</div>
          <div class="cargo">Auxiliar de Sistemas</div>
        </div>

        <div class="firma-block">
          <div style="text-align:left; font-size:11px; margin-bottom:4px;">Recibe,</div>
          <div class="firma-line"></div>
          <div class="nombre">${asset.assignedToFullName ?? '___________________'}</div>
          <div class="cargo">${asset.assignedToPosition ?? 'Colaborador'}</div>
          <div class="cc-line">Firma: ___________________________</div>
          <div class="cc-line">C.C.: ____________________________</div>
        </div>
      </div>

      <script>
        window.onload = () => window.print();
      </script>
    </body>
    </html>
  `;
    const ventana = window.open(
      '',
      '_blank',
      `width=${window.screen.width},height=${window.screen.height},left=0,top=0`,
    );
    if (ventana) {
      ventana.document.write(html);
      ventana.document.close();
    }
  }

  // ── Modal confirmación eliminar ──────────
  showDeleteConfirm = false;
  assetToDelete: FixedAssetResponse | null = null;

  openDeleteConfirm(asset: FixedAssetResponse): void {
    this.assetToDelete = asset;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.assetToDelete = null;
    this.showDeleteConfirm = false;
  }

  confirmDelete(): void {
    if (!this.assetToDelete) return;

    this.fixedAssetsService.delete(this.assetToDelete.id).subscribe({
      next: () => {
        this.assets = this.assets.filter((a) => a.id !== this.assetToDelete!.id);
        this.filterAssets();
        this.closePreview();
        this.cancelDelete();
      },
      error: (err) => console.error('Error eliminando activo:', err),
    });
  }
}
