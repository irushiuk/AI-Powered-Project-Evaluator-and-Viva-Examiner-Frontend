export type UserRole = 'student' | 'examiner' | 'teacher' | string

export type AuthUser = {
  id: number | string
  email: string
  full_name?: string
  role: UserRole
}

// Tokens are delivered as HttpOnly cookies, so the body only carries the user.
export type LoginResponse = {
  user: AuthUser
}

export type RegisterStudentRequest = {
  full_name: string
  email: string
  password: string
  confirm_password: string
  registration_number: string
  degree_program: string
  academic_year: number
  batch: string
}


export type RegisterExaminerRequest = {
  full_name: string
  email: string
  password: string
  confirm_password: string
  employee_id: string
  department: string
  designation: string
}

export type RegisterResponse = {
  user: AuthUser
  access?: string
  refresh?: string
  message?: string
}

export type TokenRefreshResponse = {
  access: string
  refresh: string
}
