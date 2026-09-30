import {
  ChangeDetectorRef,
  Component,
  Inject,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';

import {
  CommonModule,
  isPlatformBrowser,
} from '@angular/common';

import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';

import {
  Router,
  RouterModule,
} from '@angular/router';

import { SessionService } from '../../core/services/session.service';
import { UserService } from '../../core/services/user.service';
import { LoginInfo } from '../../core/models/login-info.models';

import {
  AbsenceApiService,
  AbsenceCapabilities,
} from '../../features/absence-management/services/absence-api.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  imports: [
    CommonModule,
    MatIconModule,
    MatMenuModule,
    MatButtonModule,
    RouterModule,
  ],
})
export class NavbarComponent implements OnInit {

  user: LoginInfo | null = null;

  isMenuOpen = false;

  isAbsenceMenuOpen = false;

  role: string | null = null;

  absenceCapabilities: AbsenceCapabilities = {
    canApprove: false,
    canViewIndicators: false,
    canManageAbsenceTypes: false,
  };

  constructor(
    private userService: UserService,
    private sessionService: SessionService,
    private absenceApi: AbsenceApiService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    @Inject(PLATFORM_ID)
    private platformId: Object,
  ) {}

  ngOnInit(): void {

    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    /*
     * Información general del usuario.
     *
     * Se mantiene role porque otros módulos,
     * como Activos Fijos y Administrador,
     * todavía lo utilizan.
     */
    this.userService.getCurrentUser().subscribe({
      next: (data) => {

        this.user = {
          ...data,
          loginTime: new Date(),
        };

        this.sessionService.setLoginInfo(
          this.user,
        );

        this.role =
          this.sessionService.getRole();

        this.cdr.detectChanges();
      },
    });

    /*
     * Los permisos de Ausentismo no se determinan
     * por el primer rol del usuario.
     *
     * El backend informa directamente qué puede
     * hacer cada usuario.
     */
    this.absenceApi.getCapabilities().subscribe({
      next: (capabilities) => {

        this.absenceCapabilities =
          capabilities;

        this.cdr.detectChanges();
      },

      error: () => {

        /*
         * Ante un problema de permisos o conexión,
         * dejamos visibles únicamente las opciones
         * básicas del empleado.
         */
        this.absenceCapabilities = {
          canApprove: false,
          canViewIndicators: false,
          canManageAbsenceTypes: false,
        };

        this.cdr.detectChanges();
      },
    });
  }

  profile(): void {
    this.router.navigate(['/profile']);
  }

  toggleMenu(event: MouseEvent): void {

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    this.isMenuOpen =
      !this.isMenuOpen;

    /*
     * Si se cierra el menú principal,
     * también cerramos Ausentismo.
     */
    if (!this.isMenuOpen) {
      this.isAbsenceMenuOpen = false;
    }

    this.cdr.detectChanges();

    const menuElement =
      document.querySelector('.side-menu');

    if (menuElement) {

      if (this.isMenuOpen) {
        menuElement.classList.add('open');
      } else {
        menuElement.classList.remove('open');
      }
    }
  }

  toggleAbsenceMenu(
    event: MouseEvent,
  ): void {

    event.preventDefault();
    event.stopPropagation();

    this.isAbsenceMenuOpen =
      !this.isAbsenceMenuOpen;

    this.cdr.detectChanges();
  }

  closeMenu(
    event?: MouseEvent,
  ): void {

    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }

    this.isMenuOpen = false;
    this.isAbsenceMenuOpen = false;

    const menuElement =
      document.querySelector('.side-menu');

    if (menuElement) {
      menuElement.classList.remove('open');
    }

    this.cdr.detectChanges();
  }

  onUserMenuClick(
    event: MouseEvent,
  ): void {

    event.stopPropagation();
  }

  logout(): void {

    this.sessionService.clearSession();

    this.router.navigate(['/login']);
  }
}
