export function convert(request) {
  const level = request.query?.level;
  return level ? `${request.api}:${level}` : request.api;
}
