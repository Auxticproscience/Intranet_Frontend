import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { Course } from '../models/academy.models';
import { UserCourseProgress } from '../models/user-course.model';

const MOCK_COURSES: Course[] = [
  {
    id: 1, order: 1,
    title: 'Bienvenida e Inducción Corporativa',
    description: 'Conoce la historia, misión, visión y valores de ProScience. Comprende la estructura organizacional y los canales de comunicación internos.',
    videoUrl: 'assets/videos/VIdeoHome.mp4',
    examUrl: 'https://forms.gle/examen-induccion',
    isEnrolled: true, examPassed: true,
    score: 92, approvedAt: '2025-02-10',
  },
  {
    id: 2, order: 2,
    title: 'Seguridad en el Trabajo y Salud Ocupacional',
    description: 'Normativas de seguridad industrial, uso de EPP, protocolos de emergencia y reporte de incidentes. Obligatorio para todos los colaboradores.',
    videoUrl: 'assets/videos/VIdeoHome.mp4',
    examUrl: 'https://forms.gle/examen-sst',
    isEnrolled: true, examPassed: true,
    score: 85, approvedAt: '2025-02-15',
  },
  {
    id: 3, order: 3,
    title: 'Manejo del Sistema ERP Interno',
    description: 'Aprende a usar el sistema de gestión empresarial: registro de pedidos, consulta de inventarios, generación de reportes y flujos de aprobación.',
    videoUrl: 'assets/videos/VIdeoHome.mp4',
    examUrl: 'https://forms.gle/examen-erp',
    isEnrolled: true, examPassed: false,
  },
  {
    id: 4, order: 4,
    title: 'Atención al Cliente y Comunicación Efectiva',
    description: 'Técnicas de comunicación asertiva, manejo de objeciones, protocolo de atención y servicio posventa. Enfocado en equipos comerciales y de recepción.',
    videoUrl: 'assets/videos/VIdeoHome.mp4',
    examUrl: 'https://forms.gle/examen-atencion',
    isEnrolled: false, examPassed: false,
  },
  {
    id: 5, order: 5,
    title: 'Gestión y Control de Inventarios',
    description: 'Procedimientos de recepción, almacenamiento y despacho de mercancía. Manejo de FIFO, control de diferencias y toma física de inventario.',
    videoUrl: 'assets/videos/VIdeoHome.mp4',
    examUrl: 'https://forms.gle/examen-inventario',
    isEnrolled: false, examPassed: false,
  },
  {
    id: 6, order: 6,
    title: 'Manejo Defensivo y Normas de Tránsito',
    description: 'Obligatorio para conductores y personal con vehículo asignado. Normas de tránsito vigentes, manejo defensivo y reporte de accidentes viales.',
    videoUrl: 'assets/videos/VIdeoHome.mp4',
    examUrl: 'https://forms.gle/examen-conductores',
    isEnrolled: false, examPassed: false,
  },
];

const MOCK_PROGRESS: UserCourseProgress[] = [
  { courseId: 1, examPassed: true,  score: 92, approvedAt: '2025-02-10', attempts: 1 },
  { courseId: 2, examPassed: true,  score: 85, approvedAt: '2025-02-15', attempts: 2 },
  { courseId: 3, examPassed: false, score: 0,  attempts: 1 },
];

@Injectable({ providedIn: 'root' })
export class AcademyApiService {

  getCourses(): Observable<Course[]> {
    return of(MOCK_COURSES);
  }

  enroll(courseId: number): Observable<any> {
    const course = MOCK_COURSES.find(c => c.id === courseId);
    if (course) course.isEnrolled = true;
    return of({ success: true });
  }

  approve(courseId: number): Observable<any> {
    return of({ success: true });
  }

  getMyCourses(): Observable<UserCourseProgress[]> {
    return of(MOCK_PROGRESS);
  }
}
