El archivo [`firestore.rules`](firestore.rules) ya contiene una base lista para pegar en Firebase Console o usar con el CLI. Usa claims de Auth para distinguir `admin` y `super_admin`, protege `users/{uid}` y deja `carts` publico.

La app tambien lee roles desde `users/{uid}` para habilitar acceso administrativo. Si mantienes cualquier bootstrap basado en cliente, usalo como herramienta de desarrollo o bootstrap inicial; para produccion, mueve la elevacion de roles a custom claims o a un backend confiable y evita que el navegador pueda escribir `role` libremente.
*