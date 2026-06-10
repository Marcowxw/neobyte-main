# Neobyte

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.3.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Roles Y Administracion

NeoByte usa una coleccion `users/{uid}` en Firestore para leer el rol del usuario autenticado. Los valores esperados son `user`, `admin` y `super_admin`.

Para crear un usuario privilegiado de forma local, usa el seed script:

```bash
node scripts/seed-admin.mjs
```

Puedes personalizar el rol con `ADMIN_ROLE=admin` o `ADMIN_ROLE=super_admin`. En la interfaz, los usuarios con acceso privilegiado ven el acceso a `Stock` en el navbar y entran al panel `/inventario`.

Para produccion, conviene restringir la escritura del campo `role` a un backend confiable o a Firebase custom claims; el cliente no deberia poder autoelevarse a admin.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
