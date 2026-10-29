// Public build configuration only; never include credentials or session secrets.
// A same-origin reverse proxy should forward /api/* to backend /*.
export const environment = { apiUrl: '/api' };
