# WhatCanICook Frontend

React + TypeScript frontend for the WhatCanICook API.

## Development

Run the Django API from `../backend` on port `8000`, then run:

```powershell
npm install
npm run dev
```

The Vite dev server proxies `/api` and `/media` to `http://127.0.0.1:8000`.

## Checks

```powershell
npm run lint
npm run build
```
