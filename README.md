# Vahvuusseikkailu — cấu trúc dự án

Dự án được tổ chức thành hai tầng (tier):

```
vahvuus-seikkailu/
├── frontend/     ← Ứng dụng (TanStack Start = React + SSR)
└── backend/      ← Tầng dữ liệu / backend thật sự (Supabase)
```

## frontend/ — Ứng dụng

Đây là toàn bộ app, viết bằng **TanStack Start** (React 19 + Vite). Đây là một
framework **full-stack**: giao diện (các trang React) và một lớp server nhỏ
(SSR + middleware) nằm chung trong một bản build, deploy như một đơn vị duy nhất.

- `src/routes/`      — các trang (route) React, đồng thời là nơi điều hướng
- `src/components/`  — component giao diện (gồm shadcn/ui trong `ui/`)
- `src/lib/`         — logic phía client: nội dung màn hình, i18n, tiến độ, meter…
- `src/hooks/`       — React hooks (autosave, idle-logout…)
- `src/integrations/supabase/` — client kết nối Supabase (browser + server)
- `src/server.ts`, `src/start.ts` — lớp SSR/middleware (xử lý lỗi, gắn auth)
- `vite.config.ts`, `tsconfig.json`, `package.json` … — cấu hình build

Chạy:
```bash
cd frontend
npm install
npm run dev
```
Biến môi trường ở `frontend/.env` (URL + key Supabase).

## backend/ — Supabase (backend thật sự)

App **không có một server backend riêng viết tay**. Mọi quy tắc dữ liệu và bảo
mật do **Supabase** đảm nhiệm: Postgres + Auth + Row-Level Security (RLS) +
các hàm SQL (RPC). Trình duyệt gọi thẳng Supabase; RLS ở tầng database bảo đảm
"học sinh chỉ thấy dữ liệu của mình, giáo viên chỉ thấy lớp mình quản lý".

- `backend/supabase/migrations/` — lịch sử schema chính thức (nguồn sự thật)
- `backend/supabase/config.toml` — cấu hình Supabase CLI
- `backend/deploy/schema-current.sql` — **schema hợp nhất, cập nhật** (paste 1 lần
  vào Supabase project mới)
- `backend/deploy/schema.sql` — bản cũ (đã dán nhãn cảnh báo, đừng dùng)
- `backend/deploy/DEPLOYMENT.md` — hướng dẫn dựng Supabase + hosting từ đầu

Dựng backend mới: mở Supabase → SQL Editor → paste `backend/deploy/schema-current.sql` → Run.

## Vì sao không tách nhỏ code trong frontend/ thành backend/ được?

TanStack Start là framework full-stack: một file route vừa là trang React vừa
có thể chứa xử lý server, và công cụ build yêu cầu `src/routes`, `src/router.tsx`,
`vite.config.ts` ở đúng vị trí. Vài file server (`server.ts`, `start.ts`,
`*.server.ts`) chỉ là lớp SSR/middleware, không phải "backend nghiệp vụ" tách
rời — chúng phải nằm trong app. Backend nghiệp vụ thực sự chính là **Supabase
(SQL)**, và nó đã được tách sẵn trong `backend/`.
