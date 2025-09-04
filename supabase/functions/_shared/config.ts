// Centralized configuration for Supabase Edge Functions
// Validates and exports environment variables to ensure consistent access

import { validateEnvVar } from "./utils.ts";

// Validate and export Supabase configuration
const supabaseUrl = validateEnvVar("SUPABASE_URL");
const supabaseServiceRoleKey = validateEnvVar("SUPABASE_SERVICE_ROLE_KEY");
const supabaseAnonKey = validateEnvVar("SUPABASE_ANON_KEY");

// Validate and export API keys (optional - only throw if the function specifically needs them)
const getOptionalEnvVar = (varName: string): string | null => {
  return Deno.env.get(varName) || null;
};

export const config = {
  supabase: {
    url: supabaseUrl,
    serviceRoleKey: supabaseServiceRoleKey,
    anonKey: supabaseAnonKey,
  },
  
  // API keys - validate only when needed by specific functions
  firebase: {
    serverKey: getOptionalEnvVar("FIREBASE_SERVER_KEY"),
    serviceAccountKey: getOptionalEnvVar("FIREBASE_SERVICE_ACCOUNT_KEY"),
  },
  
  stripe: {
    secretKey: getOptionalEnvVar("STRIPE_SECRET_KEY"),
  },
  
  openai: {
    apiKey: getOptionalEnvVar("OPENAI_API_KEY"),
  },
  
  resend: {
    apiKey: getOptionalEnvVar("RESEND_API_KEY"),
  },
  
  vapid: {
    publicKey: getOptionalEnvVar("VAPID_PUBLIC_KEY"),
    privateKey: getOptionalEnvVar("VAPID_PRIVATE_KEY"),
  },
  
  groq: {
    apiKey: getOptionalEnvVar("GROQ_API_KEY"),
  },
  
  google: {
    playServiceAccountKey: getOptionalEnvVar("GOOGLE_PLAY_SERVICE_ACCOUNT_KEY"),
  },
  
  android: {
    packageName: getOptionalEnvVar("ANDROID_PACKAGE_NAME"),
  }
};

// Helper to validate required keys for specific functions
export function validateRequiredConfig(requiredKeys: string[]) {
  const missing = requiredKeys.filter(key => {
    const parts = key.split('.');
    let value = config as any;
    for (const part of parts) {
      value = value?.[part];
    }
    return !value;
  });
  
  if (missing.length > 0) {
    throw { 
      message: `Missing required environment variables: ${missing.join(', ')}`, 
      status: 500 
    };
  }
}