<<<<<<< HEAD
# MediCare HMS frontend

## Run locally

The React app proxies `/api` requests to the Laravel backend at `http://127.0.0.1:8000`.
Both processes must be running before attempting registration or sign-in.

In one terminal:

```powershell
Set-Location 'C:\xampp\htdocs\Hospital Management System\backend'
php artisan serve
```

In a second terminal:

```powershell
Set-Location 'C:\xampp\htdocs\Hospital Management System\frontend'
npm run dev
```

Open the URL Vite prints (usually `http://localhost:5173`).

## Frontend tooling
=======
# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.
>>>>>>> bd5e876a8b6d8083d786a30260aa69f6332f42bf

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.
