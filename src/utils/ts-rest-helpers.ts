export const convertDecimalToNumber = (value: unknown): number => {
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return typeof value === "number" ? value : parseFloat(String(value));
};

export const formatSuccessResponse = <T>(
  data: T,
  message = "OK",
  statusCode = 200
) => ({
  success: true as const,
  message,
  data,
  statusCode,
});

export const formatErrorResponse = (
  message: string,
  statusCode: number,
  errors?: Array<{ path: string; errors: string[] }>
) => ({
  success: false as const,
  message,
  statusCode,
  ...(errors && { errors }),
});

export const formatDate = (date: Date | string): string => {
  if (date instanceof Date) {
    if (isNaN(date.getTime())) return new Date().toISOString();
    return date.toISOString();
  }
  if (typeof date === "string") {
    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) return new Date().toISOString();
    return parsed.toISOString();
  }
  return new Date().toISOString();
};

// ============================================================================
// TS-Rest Response Helpers
// ============================================================================

export const tsRestSuccessResponse = <T, const S extends number>(
  data: T,
  status: S,
  message = "OK"
) =>
  ({
    status,
    body: formatSuccessResponse(data, message, status),
  } as { status: S; body: ReturnType<typeof formatSuccessResponse<T>> });

export const tsRestErrorResponse = <const S extends number>(
  message: string,
  status: S,
  errors?: Array<{ path: string; errors: string[] }>
) =>
  ({
    status,
    body: formatErrorResponse(message, status, errors),
  } as { status: S; body: ReturnType<typeof formatErrorResponse> });
