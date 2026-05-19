# Proyecto Fútbol - Frontend

Aplicación web para la gestión de un club de fútbol, desarrollada con Angular.

## Características

- Gestión de usuarios (administradores, profesores, clientes)
- Formulario de postulación para nuevos miembros
- Sistema de pagos y validación de vouchers
- Panel de administración
- Evaluación de rendimiento de jugadores
- Galería de imágenes y noticias del club

## Tecnologías

- Angular 21
- PrimeNG (componentes UI)
- TypeScript
- SCSS

## Despliegue

### Desarrollo local

```bash
npm install
ng serve
```

Navegar a `http://localhost:4200/`

### Producción

```bash
npm run vercel-build
```

Los archivos de producción se generan en `dist/proyecto-pes`

### Vercel

El proyecto está configurado para desplegarse automáticamente en Vercel desde GitHub.

## API Backend

La aplicación consume una API REST alojada en Render:
`https://backend-futbol-f5sj.onrender.com`

## Estructura del proyecto

```
src/
├── app/
│   ├── admin/           # Panel de administración
│   ├── formulario/      # Formulario de postulación
│   ├── login/           # Autenticación
│   ├── pages/
│   │   ├── inicio/      # Página principal
│   │   ├── pagos/       # Gestión de pagos
│   │   └── rendimiento/ # Evaluación de jugadores
│   └── services/        # Servicios API
├── environments/        # Configuración de entornos
└── styles.css           # Estilos globales
```

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
