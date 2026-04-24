export class HttpError extends Error {
  status: number
  details?: unknown

  constructor(status: number, message: string, details?: unknown) {
    super(message)
    this.status = status
    this.details = details
    this.name = 'HttpError'
  }
}

const isValidationDetails = (
  details: unknown,
): details is { fieldErrors?: Record<string, string[]>; formErrors?: string[] } => {
  return Boolean(details && typeof details === 'object')
}

export function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof HttpError) {
    const details = error.details

    if (isValidationDetails(details)) {
      const fieldErrors = details.fieldErrors ?? {}
      const firstFieldError = Object.values(fieldErrors).find((errors) => errors.length > 0)?.[0]
      const firstFormError = details.formErrors?.[0]

      if (firstFieldError) return firstFieldError
      if (firstFormError) return firstFormError
    }

    return error.message || fallback
  }

  if (error instanceof Error) {
    return error.message || fallback
  }

  return fallback
}
