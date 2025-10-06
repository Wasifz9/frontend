import { sequence } from "@sveltejs/kit/hooks";
import PocketBase from "pocketbase";
import { serializeNonPOJOs } from "$lib/utils";

export const handle = sequence(async ({ event, resolve }) => {

  // Use a ternary operator instead of the logical OR for better compatibility
  const pbURL = import.meta.env.VITE_USEAST_POCKETBASE_URL; 
  const apiURL = import.meta.env.VITE_USEAST_API_URL; 
  const fastifyURL = import.meta.env.VITE_USEAST_FASTIFY_URL;
  const wsURL = import.meta.env.VITE_USEAST_WS_URL;
  
  const themeMode = event?.cookies?.get("theme-mode") || "dark";
  
  event.locals = {
    pb: new PocketBase(pbURL),
    apiURL,
    fastifyURL,
    wsURL,
    apiKey: import.meta.env.VITE_STOCKNEAR_API_KEY,
    themeMode,
  };

  const authCookie = event?.request?.headers?.get("cookie") || "";

  // Load auth from cookie - PocketBase uses 'pb_auth' by default
  event.locals.pb.authStore?.loadFromCookie(authCookie);

  if (event?.locals?.pb?.authStore?.isValid) {
    // Verify the auth is actually valid by checking the model
    const authModel = event?.locals?.pb?.authStore?.model;
    if (authModel && authModel.id) {
      event.locals.user = serializeNonPOJOs(authModel);
      
      // Optional: Refresh auth token in background if it's close to expiring
      const authData = event.locals.pb.authStore.token;
      if (authData) {
        try {
          // Parse JWT to check expiration
          const payload = JSON.parse(atob(authData.split('.')[1]));
          const expirationTime = payload.exp * 1000;
          const currentTime = Date.now();
          const timeUntilExpiry = expirationTime - currentTime;
          
          // Only refresh if token expires in less than 30 minutes (reduced from 1 hour)
          if (timeUntilExpiry < 30 * 60 * 1000) {
            // Refresh in background without blocking the request
            event?.locals?.pb?.collection("users")?.authRefresh()
              .then(() => {
                console.log('[Auth] Token refreshed in background');
              })
              .catch((e) => {
                // Only clear auth on actual auth errors (401, 403)
                if (e.status === 401 || e.status === 403) {
                  console.log('[Auth] Token refresh failed - invalid token');
                }
                // Ignore network errors - keep existing auth
              });
          }
        } catch (e) {
          // If we can't parse the token, keep existing auth but log it
          console.log('[Auth] Could not parse token for expiry check:', e.message);
        }
      }
    } else {
      // Auth store says valid but no model - clear it
      event.locals.pb.authStore.clear();
      event.locals.user = undefined;
      console.log('[Auth] Invalid auth store detected - cleared');
    }
  }

  const response = await resolve(event, {
    transformPageChunk: ({html}) => html.replace('data-theme=""', `data-theme="${themeMode}"`)
  });

  // Determine if we're in production based on the URL
  const isProduction = event.url.hostname !== 'localhost' && 
                       !event.url.hostname.includes('127.0.0.1') &&
                       !event.url.hostname.includes('192.168.');

  // Export cookie with appropriate settings
  const cookieString = event?.locals?.pb?.authStore?.exportToCookie({
    httpOnly: true,
    path: "/",
    sameSite: "lax", // Use lax for both to prevent issues
    secure: isProduction,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  response.headers.append("set-cookie", cookieString);

  return response;
});
