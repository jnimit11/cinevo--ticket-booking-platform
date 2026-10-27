export function successResponse(res, statusCode, data = {}, message) {
  const body = {
    success: true,
    ...(message ? { message } : {}),
    ...data,
  };
  return res.status(statusCode).json(body);
}

export function errorResponse(res, statusCode, message, errors) {
  const body = {
    success: false,
    message,
    ...(errors ? { errors } : {}),
  };
  return res.status(statusCode).json(body);
}
