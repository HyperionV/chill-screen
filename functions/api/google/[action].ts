import { handleGoogleSession, type Env } from '../../_lib/google-session';

interface Context {
  request: Request;
  env: Env;
  params: { action?: string | string[] };
}

/** One route serves status, session, token and signout; the logic and its tests live in `_lib/google-session.ts`. */
export const onRequest = (context: Context): Promise<Response> => {
  const { action } = context.params;
  return handleGoogleSession(context.request, context.env, Array.isArray(action) ? (action[0] ?? '') : (action ?? ''));
};
