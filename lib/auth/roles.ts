export type Role = "admin" | "analyst"

export type SessionUser = {
  id: string
  email: string | null
  role: Role
}

// Admins are users in the Cognito "admin" group; everyone else is an analyst
export function roleFromGroups(groups: unknown): Role {
  return Array.isArray(groups) && groups.includes("admin") ? "admin" : "analyst"
}

// Which role may open each dashboard page. Mirrors ACTION_ROLES in the Lambda's permissions.py.
export const PAGE_ROLES: Record<string, Role[]> = {
  "/dashboard": ["admin"],
  "/dashboard/screen-name": ["admin", "analyst"],
  "/dashboard/batch-screening": ["admin", "analyst"],
  "/dashboard/evaluate-screen": ["admin", "analyst"],
}

export function canOpen(role: Role | null | undefined, path: string) {
  return !!role && (PAGE_ROLES[path] ?? []).includes(role)
}

// Each role's first page after sign-in
export function homeFor(role: Role) {
  return role === "admin" ? "/dashboard" : "/dashboard/screen-name"
}
