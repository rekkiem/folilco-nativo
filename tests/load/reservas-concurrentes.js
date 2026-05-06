/**
 * tests/load/reservas-concurrentes.js
 * Prueba de carga: simulación de reservas simultáneas.
 * Ejecutar: node tests/load/reservas-concurrentes.js
 */

const BASE_URL = process.env.BASE_URL ?? "http://localhost:3003";
const N = parseInt(process.env.CONCURRENCIA ?? "10");

function uuidFake() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}
function fechaFutura(dias) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().split("T")[0];
}
function stats(resultados) {
  const times = resultados.map((r) => r.ms);
  const ok = resultados.filter((r) => r.ok).length;
  const e5xx = resultados.filter((r) => r.status >= 500).length;
  const r429 = resultados.filter((r) => r.status === 429).length;
  const avg = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
  return { ok, e5xx, r429, avg, max: Math.max(...times), min: Math.min(...times) };
}

async function testHome() {
  console.log(`\n🏠 ${N} cargas del homepage simultáneas`);
  const reqs = Array.from({ length: N }, () => {
    const t = Date.now();
    return fetch(BASE_URL)
      .then((r) => ({ status: r.status, ok: r.ok, ms: Date.now() - t }))
      .catch((e) => ({ status: 0, ok: false, ms: Date.now() - t, error: e.message }));
  });
  const res = await Promise.all(reqs);
  const s = stats(res);
  console.log(`  OK: ${s.ok}/${N} | avg: ${s.avg}ms | max: ${s.max}ms | 5xx: ${s.e5xx}`);
  console.log(`  ${s.e5xx === 0 && s.max < 5000 ? "✅ PASS" : "❌ FAIL"}`);
  return res;
}

async function testDisponibilidad(productoId) {
  console.log(`\n📅 ${N} consultas de disponibilidad simultáneas`);
  const reqs = Array.from({ length: N }, (_, i) => {
    const fi = fechaFutura(30 + i * 3);
    const ff = fechaFutura(32 + i * 3);
    const t = Date.now();
    return fetch(`${BASE_URL}/api/availability?producto_id=${productoId}&fecha_inicio=${fi}&fecha_fin=${ff}`)
      .then(async (r) => ({ status: r.status, ok: r.ok, ms: Date.now() - t }))
      .catch((e) => ({ status: 0, ok: false, ms: Date.now() - t }));
  });
  const res = await Promise.all(reqs);
  const s = stats(res);
  console.log(`  OK: ${s.ok}/${N} | avg: ${s.avg}ms | max: ${s.max}ms | 5xx: ${s.e5xx}`);
  console.log(`  ${s.e5xx === 0 ? "✅ PASS" : "❌ FAIL"}`);
  return res;
}

async function testReservas(productoId) {
  console.log(`\n📋 ${N} creaciones de reserva simultáneas`);
  const reqs = Array.from({ length: N }, (_, i) => {
    const fi = fechaFutura(100 + i * 5);
    const ff = fechaFutura(102 + i * 5);
    const t = Date.now();
    return fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        producto_id: productoId,
        fecha_inicio: fi, fecha_fin: ff,
        cantidad_personas: 2,
        huesped_nombre: `Load Test ${i + 1}`,
        huesped_email: `load${i + 1}@test.cl`,
        huesped_telefono: `+5691234567${i}`,
      }),
    })
      .then(async (r) => ({ status: r.status, ok: r.ok || r.status === 429, ms: Date.now() - t }))
      .catch((e) => ({ status: 0, ok: false, ms: Date.now() - t }));
  });
  const res = await Promise.all(reqs);
  const s = stats(res);
  console.log(`  OK+429: ${s.ok}/${N} | avg: ${s.avg}ms | 5xx: ${s.e5xx} | 429: ${s.r429}`);
  console.log(`  ${s.e5xx === 0 ? "✅ PASS" : "❌ FAIL"}`);
  return res;
}

async function testDuplicado(productoId) {
  console.log(`\n🔁 3 reservas simultáneas MISMA fecha (solo 1 debe pasar)`);
  const fi = fechaFutura(300); const ff = fechaFutura(302);
  const reqs = Array.from({ length: 3 }, (_, i) => {
    const t = Date.now();
    return fetch(`${BASE_URL}/api/reservations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        producto_id: productoId, fecha_inicio: fi, fecha_fin: ff,
        cantidad_personas: 1, huesped_nombre: `Dup ${i}`,
        huesped_email: `dup${i}@test.cl`, huesped_telefono: "+56912345678",
      }),
    })
      .then(async (r) => ({ status: r.status, ok: r.ok, ms: Date.now() - t }))
      .catch((e) => ({ status: 0, ok: false, ms: Date.now() - t }));
  });
  const res = await Promise.all(reqs);
  const exitosas = res.filter((r) => r.status === 200 || r.status === 201).length;
  console.log(`  Exitosas: ${exitosas}/3 | Conflictos 409: ${res.filter((r) => r.status === 409).length}`);
  console.log(`  ${exitosas <= 1 ? "✅ PASS: max 1 duplicada" : "⚠️  WARN: múltiples duplicadas"}`);
  return res;
}

async function main() {
  console.log("═══════════════════════════════════════════");
  console.log(`  🌿 FOLILCO NATIVO – PRUEBAS DE CARGA`);
  console.log(`  URL: ${BASE_URL} | Concurrencia: ${N}`);
  console.log("═══════════════════════════════════════════");

  let productoId;
  try {
    const r = await fetch(`${BASE_URL}/api/products`);
    const p = await r.json();
    if (!Array.isArray(p) || p.length === 0) throw new Error("Sin productos");
    productoId = p[0].id;
    console.log(`\n📦 Producto: ${p[0].nombre}`);
  } catch (e) {
    console.error(`❌ No se puede conectar a ${BASE_URL}. Ejecuta 'npm run dev' primero.`);
    process.exit(1);
  }

  const t0 = Date.now();
  await testHome();
  await testDisponibilidad(productoId);
  await testReservas(productoId);
  await testDuplicado(productoId);

  console.log(`\n═══════════════════════════════════════════`);
  console.log(`  ✅ Completado en ${Date.now() - t0}ms`);
  console.log("═══════════════════════════════════════════\n");
}

main().catch((e) => { console.error(e); process.exit(1); });
