import {
  type RouteConfig,
  route,
  index,
  layout,
} from "@react-router/dev/routes";

export default [
  // Auth routes — tanpa sidebar layout
  layout("routes/_auth/layout.tsx", [
    route("login", "routes/_auth/login.tsx"),
  ]),

  // App routes — dengan sidebar layout
  layout("routes/_layout.tsx", [
    index("routes/home/index.tsx"),
    route("dashboard", "routes/dashboard/index.tsx"),
    route("dashboard/templates", "routes/dashboard/templates/index.tsx"),
    route("dashboard/templates/new", "routes/dashboard/templates/new.tsx"),
    route("letters", "routes/letters/index.tsx"),
    route("letters/:id", "routes/letters/$id.tsx"),
    route("letters/create/mou", "routes/letters/mou.tsx"),
    route("approval", "routes/approval/index.tsx"),
    route("settings/signature", "routes/dashboard/signature.tsx"),
  ]),
] satisfies RouteConfig;