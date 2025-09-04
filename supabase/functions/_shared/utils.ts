// Shared utilities for Supabase Edge Functions
// Centralizes error handling and common functions to improve code quality

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Enhanced error handler with better context and status codes
export function handleError(error: any, context?: string) {
  const errorMessage = error?.message || 'Ocorreu um erro inesperado.';
  const errorStatus = error?.status || error?.code || 500;
  
  // Log detailed error information for debugging
  console.error(`❌ [${context || 'ERROR'}]:`, {
    message: errorMessage,
    status: errorStatus,
    stack: error?.stack,
    details: error
  });

  return new Response(JSON.stringify({ 
    error: errorMessage,
    context: context 
  }), {
    status: errorStatus,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Enhanced success response helper
export function handleSuccess(data: any, message?: string, status = 200) {
  return new Response(JSON.stringify({ 
    success: true,
    data,
    message 
  }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Centralized authentication helper
export async function authenticateUser(req: Request, supabaseClient: any) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw { message: "No authorization header provided", status: 401 };
  }

  const token = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
  
  if (userError) {
    throw { message: `Authentication error: ${userError.message}`, status: 401 };
  }
  
  const user = userData.user;
  if (!user?.email) {
    throw { message: "User not authenticated or email not available", status: 401 };
  }

  return user;
}

// Standardized request logging
export function logRequest(functionName: string, method: string, details?: any) {
  const timestamp = new Date().toISOString();
  console.log(`🚀 [${functionName}] ${method} request at ${timestamp}`, details ? `- ${JSON.stringify(details)}` : '');
}

// Environment variable validation helper
export function validateEnvVar(varName: string): string {
  const value = Deno.env.get(varName);
  if (!value) {
    throw { message: `${varName} environment variable not configured`, status: 500 };
  }
  return value;
}