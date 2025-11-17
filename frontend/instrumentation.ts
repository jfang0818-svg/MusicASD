export async function register() {
  // This file is required for Next.js 16.0.3 to resolve the
  // 'private-next-instrumentation-client' module
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Server-side instrumentation
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    // Edge runtime instrumentation
  }
}
