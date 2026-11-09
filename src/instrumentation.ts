/**
 * Next.js instrumentation — se ejecuta al arrancar el servidor.
 * NO debe fallar durante `next build` (phase-production-build).
 */
export async function register() {
  const phase = process.env.NEXT_PHASE;
  if (phase === "phase-production-build" || phase === "phase-export") {
    return;
  }

  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { ensureEnvValidated } = await import("@/lib/env");
    ensureEnvValidated();
  }
}
