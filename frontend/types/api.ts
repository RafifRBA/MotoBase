export type Role = "OWNER" | "ADMIN" | "MECHANIC" | "CUSTOMER";

export interface ApiSuccess<T> {
  success: true;
  message?: string;
  data: T;
  meta?: unknown;
}

export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    details: unknown;
    requestId?: string;
  };
}

export interface PageMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface Paged<T> {
  items: T[];
  meta: PageMeta;
}

export type ListParams = Record<string, string | number | boolean | undefined | null>;
