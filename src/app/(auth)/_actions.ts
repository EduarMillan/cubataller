"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const next = (formData.get("next") as string) || "/dashboard";

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(next);
}

export async function signup(formData: FormData) {
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = formData.get("password") as string;

  const headersList = await headers();
  const origin = headersList.get("origin") || headersList.get("x-forwarded-host") || "http://localhost:3000";
  const baseUrl = origin.startsWith("http") ? origin : `https://${origin}`;

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${baseUrl}/auth/callback?next=/onboarding`,
    },
  });

  if (error) {
    const lower = error.message.toLowerCase();
    const friendly =
      lower.includes("already") || lower.includes("registered") || lower.includes("exists")
        ? `El correo ${email} ya está registrado. Inicia sesión o usa otro correo.`
        : error.message;
    redirect(`/registro?error=${encodeURIComponent(friendly)}`);
  }

  // Supabase doesn't return an error when the email already exists (anti email-enumeration);
  // it returns a user with an empty identities array instead.
  if (!data.user || (data.user.identities ?? []).length === 0) {
    redirect(
      `/registro?error=${encodeURIComponent(
        `El correo ${email} ya está registrado. Inicia sesión o usa otro correo.`,
      )}`,
    );
  }

  redirect("/onboarding");
}

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get("email") as string;

  const headersList = await headers();
  const origin = headersList.get("origin") || headersList.get("x-forwarded-host") || "http://localhost:3000";
  const baseUrl = origin.startsWith("http") ? origin : `https://${origin}`;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/callback?next=/recuperar/nueva`,
  });

  if (error) {
    redirect(`/recuperar?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/recuperar?sent=1");
}

export async function updatePassword(formData: FormData) {
  const password = formData.get("password") as string;

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    redirect(`/recuperar/nueva?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/dashboard");
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
