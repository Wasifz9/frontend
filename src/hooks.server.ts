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
    try {
      // Add timeout to prevent hanging requests
      const refreshPromise = event?.locals?.pb?.collection("users")?.authRefresh();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Auth refresh timeout')), 5000)
      );
      
      await Promise.race([refreshPromise, timeoutPromise]);
      event.locals.user = serializeNonPOJOs(event?.locals?.pb?.authStore?.model);
    } catch (e) {
      // Only clear auth if it's not a network/timeout error and not a 401
      if (!e.message?.includes('timeout') && 
          !e.message?.includes('network') && 
          !e.message?.includes('fetch')) {
        event.locals.pb.authStore.clear();
        event.locals.user = undefined;
      } else {
        // Keep the existing auth on network errors
        event.locals.user = serializeNonPOJOs(event?.locals?.pb?.authStore?.model);
      }
      
      // Only log non-network errors
      if (!e.message?.includes('fetch failed')) {
        console.log('Auth refresh error:', e.message);
      }
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
