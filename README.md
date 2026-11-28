# SmartShrimp Web Portal

> Farm Operations Management and Technical Consulting System for Shrimp Farms

The SmartShrimp web portal is the workspace for administrators and aquaculture experts.

## Features

- **Administrators** manage accounts and the reference documents used by the SmartShrimp assistant, and monitor system activity.
- **Experts** review assigned production cycles, water quality, and shrimp health records. They manage disease cases and communicate with technicians.

## Technology

**React · Vite · React Router · Ant Design · Tailwind CSS**

## Getting started

Use Node.js 22.12 or later and a running SmartShrimp Backend. Set `VITE_API_BASE_URL` in `.env` if the API is served at an address other than `http://localhost:3000/api/v1`. The backend must allow the portal's origin when it differs from the defaults.

```sh
npm ci
npm run dev
```

Vite serves the portal at `http://localhost:5173` by default. Use `npm run lint` to check the source and `npm run build` to create a production bundle in `dist/`.

## Project team

**Mentor** — Nguyễn Đình Vinh

**Members**

- Phạm Hải Đăng
- Nguyễn Thị Kim Soàn
- Phạm Quốc Tự
- Liêu Tấn Đạt
- Cô Thái Bảo
