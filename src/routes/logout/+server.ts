import { redirect } from "@sveltejs/kit";

export const POST = ({ locals, cookies }) => {
  // Clear auth store
  locals.pb.authStore.clear();
  locals.user = undefined;
  
  // Clear the PocketBase auth cookie properly
  cookies.delete('pb_auth', { 
    path: '/'
  });

  redirect(303, "/");
};
