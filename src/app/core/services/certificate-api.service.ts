import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Certificate } from '../models/certificate.model';

const MOCK_CERTS: Certificate[] = [
  {
    id: 1, courseId: 1,
    courseTitle: 'Bienvenida e Inducción Corporativa',
    issuedAt: '2025-02-10',
    userName: 'Luis Velez',
    score: 92,
  },
  {
    id: 2, courseId: 2,
    courseTitle: 'Seguridad en el Trabajo y Salud Ocupacional',
    issuedAt: '2025-02-15',
    userName: 'Luis Velez',
    score: 85,
  },
];

@Injectable({ providedIn: 'root' })
export class CertificateService {

  getMyCertificates(): Observable<Certificate[]> {
    return of(MOCK_CERTS);
  }

  openCertificate(courseId: number): void {
    const cert = MOCK_CERTS.find(c => c.courseId === courseId);
    if (!cert) return;
    // Generar HTML del certificado y abrirlo en nueva pestaña
    const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Certificado — ${cert.courseTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=DM+Sans:wght@400;500&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { background:#EDE4D9; display:flex; align-items:center; justify-content:center; min-height:100vh; font-family:'DM Sans',sans-serif; }
    .cert {
      background:#fff; width:800px; padding:60px; border:8px solid #0A142D;
      outline:4px solid #CC521B; outline-offset:-16px; text-align:center;
      box-shadow:0 8px 40px rgba(10,20,45,0.2);
    }
    .logo-text { font-family:'Cormorant Garamond',serif; font-size:13px; letter-spacing:0.3em; color:#CC521B; text-transform:uppercase; margin-bottom:8px; }
    h1 { font-family:'Cormorant Garamond',serif; font-size:42px; color:#0A142D; margin:16px 0 8px; }
    .subtitle { font-size:14px; color:#888; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:36px; }
    .recipient-label { font-size:13px; color:#888; margin-bottom:6px; }
    .recipient { font-family:'Cormorant Garamond',serif; font-size:32px; color:#CC521B; font-weight:600; border-bottom:2px solid #CC521B; display:inline-block; padding-bottom:6px; margin-bottom:28px; }
    .course-label { font-size:13px; color:#888; margin-bottom:6px; }
    .course { font-size:20px; font-weight:600; color:#0A142D; margin-bottom:32px; max-width:500px; margin-left:auto; margin-right:auto; line-height:1.3; }
    .score { background:#0A142D; color:#EDE4D9; display:inline-block; padding:8px 24px; border-radius:20px; font-size:14px; margin-bottom:36px; }
    .footer { display:flex; justify-content:space-between; align-items:flex-end; margin-top:48px; border-top:1px solid #e0d8cc; padding-top:24px; }
    .sig { text-align:center; }
    .sig-line { width:160px; border-top:1px solid #0A142D; margin:0 auto 6px; }
    .sig-name { font-size:13px; font-weight:600; color:#0A142D; }
    .sig-role { font-size:11px; color:#888; }
    .date { font-size:12px; color:#888; }
  </style>
</head>
<body>
  <div class="cert">
    <div class="logo-text">ProScience Lab S.A.S.</div>
    <h1>Certificado</h1>
    <div class="subtitle">de Formación Interna</div>
    <div class="recipient-label">Otorgado a</div>
    <div class="recipient">${cert.userName}</div>
    <div class="course-label">por haber completado satisfactoriamente el curso</div>
    <div class="course">${cert.courseTitle}</div>
    <div class="score">Calificación: ${cert.score}/100</div>
    <div class="footer">
      <div class="date">Expedido el ${new Date(cert.issuedAt).toLocaleDateString('es-CO',{day:'2-digit',month:'long',year:'numeric'})}</div>
      <div class="sig">
        <div class="sig-line"></div>
        <div class="sig-name">Luis Velez</div>
        <div class="sig-role">Auxiliar de Sistemas</div>
      </div>
      <div class="sig">
        <div class="sig-line"></div>
        <div class="sig-name">Laura Rivera</div>
        <div class="sig-role">Talento Humano</div>
      </div>
    </div>
  </div>
</body>
</html>`;
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
}
