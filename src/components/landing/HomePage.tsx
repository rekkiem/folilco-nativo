"use client";

import Link from "next/link";
import Image from "next/image";

const ALOJAMIENTOS = [
  {
    nombre: "Cabaña del Bosque",
    desc: "Rodeada de bosque nativo para 2 personas. Incluye desayuno artesanal.",
    precio: 85000,
    img: "https://images.unsplash.com/photo-1482192505345-5852cc56a9b7?w=600&q=80",
    id: "alojamiento-1",
  },
  {
    nombre: "Domo Patagónico",
    desc: "Vista al lago y cielo estrellado. Perfecta para desconectarse.",
    precio: 120000,
    img: "https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=600&q=80",
    id: "alojamiento-2",
  },
  {
    nombre: "Cabaña Familiar",
    desc: "Espaciosa cabaña para hasta 5 personas con fogón exterior.",
    precio: 150000,
    img: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?w=600&q=80",
    id: "alojamiento-3",
  },
];

const EXPERIENCIAS = [
  {
    nombre: "Cabalgata al Volcán",
    desc: "4 horas a caballo con guía local incluido.",
    precio: 35000,
    emoji: "🐴",
  },
  {
    nombre: "Día de Campo",
    desc: "Ordeña, queso artesanal y almuerzo campestre.",
    precio: 28000,
    emoji: "🌾",
  },
  {
    nombre: "Noche de Fogón",
    desc: "Música, leyendas mapuche y asado en comunidad.",
    precio: 15000,
    emoji: "🔥",
  },
];

function formatCLP(n: number) {
  return new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", minimumFractionDigits: 0 }).format(n);
}

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* ── NAV ─────────────────────────────────────────── */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-forest-950/90 backdrop-blur-md border-b border-forest-800/50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="font-display text-xl text-cream-100 hover:text-honey-400 transition-colors">
            🌿 Folilco Nativo
          </Link>
          <div className="hidden md:flex items-center gap-6 text-sm text-cream-200">
            <a href="#alojamiento" className="hover:text-honey-400 transition-colors">Alojamiento</a>
            <a href="#experiencias" className="hover:text-honey-400 transition-colors">Experiencias</a>
            <a href="#productos" className="hover:text-honey-400 transition-colors">Productos</a>
            <a href="#nosotros" className="hover:text-honey-400 transition-colors">Nosotros</a>
          </div>
          <Link href="/reservar" className="btn-honey text-sm px-4 py-2">
            Reservar ahora
          </Link>
        </div>
      </nav>

      {/* ── HERO ────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('https://images.unsplash.com/photo-1426604966848-d7adac402bff?w=1600&q=80')" }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-forest-950/70 via-forest-950/50 to-forest-950/80" />

        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-forest-800/60 border border-forest-600/40 text-honey-400 text-sm px-4 py-2 rounded-full mb-6 backdrop-blur-sm">
            <span>🌿</span>
            <span>Cooperativa Agroturística – Sur de Chile</span>
          </div>
          <h1 className="font-display text-5xl md:text-7xl text-cream-50 leading-tight mb-6 text-balance">
            El sur de Chile
            <span className="text-honey-400 block">como nunca lo viviste</span>
          </h1>
          <p className="text-cream-200 text-lg md:text-xl mb-10 max-w-2xl mx-auto text-balance">
            Cabañas, domos, cabalgatas y productos artesanales en el corazón del bosque nativo.
            Una cooperativa de vecinos que cuida la tierra.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/reservar" className="btn-honey text-base px-8 py-4">
              🏡 Ver disponibilidad
            </Link>
            <a href="#nosotros" className="btn-secondary border-cream-200 text-cream-100 hover:bg-cream-100 hover:text-forest-900 text-base px-8 py-4">
              Conocer la cooperativa
            </a>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-cream-300 animate-bounce">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────── */}
      <section className="bg-forest-800 py-10">
        <div className="max-w-6xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { n: "6", label: "Socios cooperativa" },
            { n: "3", label: "Cabañas y domos" },
            { n: "100%", label: "Producto local" },
            { n: "★ 4.9", label: "Valoración promedio" },
          ].map((s) => (
            <div key={s.label}>
              <div className="font-display text-3xl text-honey-400 mb-1">{s.n}</div>
              <div className="text-cream-300 text-sm">{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── ALOJAMIENTO ─────────────────────────────────── */}
      <section id="alojamiento" className="py-20 bg-cream-50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <div className="text-honey-500 text-sm font-medium uppercase tracking-widest mb-3">Donde descansar</div>
            <h2 className="section-title mb-4">Alojamientos únicos</h2>
            <p className="text-forest-600 max-w-xl mx-auto">
              Cada espacio fue construido con materiales del lugar y pensado para desconectarte del ruido del mundo.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            {ALOJAMIENTOS.map((a) => (
              <div key={a.id} className="card overflow-hidden group">
                <div className="relative h-56 overflow-hidden">
                  <img
                    src={a.img}
                    alt={a.nombre}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute bottom-3 right-3 bg-forest-900/80 backdrop-blur-sm text-honey-400 font-semibold text-sm px-3 py-1 rounded-full">
                    desde {formatCLP(a.precio)}/noche
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="font-display text-xl text-forest-900 mb-2">{a.nombre}</h3>
                  <p className="text-forest-600 text-sm mb-5">{a.desc}</p>
                  <Link href="/reservar" className="btn-primary w-full text-sm">
                    Reservar
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── EXPERIENCIAS ────────────────────────────────── */}
      <section id="experiencias" className="py-20 bg-forest-900">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <div className="text-honey-400 text-sm font-medium uppercase tracking-widest mb-3">Qué hacer</div>
            <h2 className="font-display text-3xl md:text-4xl text-cream-50 mb-4">Experiencias de campo</h2>
            <p className="text-cream-300 max-w-xl mx-auto">
              Actividades guiadas por los socios de la cooperativa. Auténtico, lento y memorable.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {EXPERIENCIAS.map((e) => (
              <div key={e.nombre} className="bg-forest-800/60 border border-forest-700/50 rounded-2xl p-8 hover:bg-forest-800 transition-colors">
                <div className="text-5xl mb-5">{e.emoji}</div>
                <h3 className="font-display text-xl text-cream-100 mb-3">{e.nombre}</h3>
                <p className="text-cream-400 text-sm mb-5">{e.desc}</p>
                <div className="flex items-center justify-between">
                  <span className="text-honey-400 font-semibold">{formatCLP(e.precio)} / persona</span>
                  <Link href="/reservar" className="text-cream-300 hover:text-honey-400 text-sm transition-colors">
                    Agregar →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRODUCTOS ───────────────────────────────────── */}
      <section id="productos" className="py-20 bg-cream-100">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-14">
            <div className="text-honey-500 text-sm font-medium uppercase tracking-widest mb-3">Del campo a tu mesa</div>
            <h2 className="section-title mb-4">Productos artesanales</h2>
          </div>
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <img
                src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80"
                alt="Miel artesanal Folilco"
                className="rounded-2xl w-full h-72 object-cover shadow-lg"
              />
            </div>
            <div className="space-y-6">
              {[
                { nombre: "🍯 Miel artesanal 500g", precio: 9500, desc: "Miel de abeja melífera de bosque nativo. Sin aditivos, cosechada a mano." },
                { nombre: "🫐 Mermelada de murta 220g", precio: 6500, desc: "Murta silvestre recolectada en temporada. Edición limitada." },
                { nombre: "🌿 Pack bienvenida", precio: 18000, desc: "Miel + mermelada + hierbas medicinales del huerto." },
              ].map((p) => (
                <div key={p.nombre} className="flex gap-4 p-4 bg-white rounded-xl border border-cream-200">
                  <div className="flex-1">
                    <div className="font-medium text-forest-900">{p.nombre}</div>
                    <div className="text-sm text-forest-600 mt-1">{p.desc}</div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="font-semibold text-honey-600">{formatCLP(p.precio)}</div>
                    <div className="text-xs text-forest-500 mt-1">Agregar al reservar</div>
                  </div>
                </div>
              ))}
              <Link href="/reservar" className="btn-honey w-full">
                Reservar con productos
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── NOSOTROS ────────────────────────────────────── */}
      <section id="nosotros" className="py-20 bg-cream-50">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <div className="text-honey-500 text-sm font-medium uppercase tracking-widest mb-3">Quiénes somos</div>
          <h2 className="section-title mb-6">Una cooperativa del sur</h2>
          <p className="text-forest-600 text-lg mb-8 text-balance">
            Folilco Nativo nació cuando seis vecinos del km 12 decidieron unir sus tierras, sus saberes
            y sus ganas de compartir el sur con el mundo. Cada reserva apoya directamente a las familias
            que cuidan este lugar.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-left mb-10">
            {[
              { emoji: "🌲", titulo: "Bosque nativo", desc: "Protegemos 40 hectáreas de araucarias y coigüe." },
              { emoji: "🤝", titulo: "Comercio justo", desc: "El 90% queda en manos de los socios." },
              { emoji: "♻️", titulo: "Sin residuos", desc: "Compost, huerto y energía solar." },
            ].map((v) => (
              <div key={v.titulo} className="bg-cream-100 rounded-xl p-5">
                <div className="text-3xl mb-3">{v.emoji}</div>
                <div className="font-semibold text-forest-900 mb-1">{v.titulo}</div>
                <div className="text-sm text-forest-600">{v.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────── */}
      <section className="py-20 bg-forest-800">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-display text-4xl text-cream-50 mb-5">
            ¿Listo para venir?
          </h2>
          <p className="text-cream-300 mb-8 text-lg">
            Elige tus fechas, completa los datos y en 2 minutos tienes tu reserva confirmada.
          </p>
          <Link href="/reservar" className="btn-honey text-lg px-10 py-4">
            🏡 Reservar ahora
          </Link>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────── */}
      <footer className="bg-forest-950 py-10 text-center">
        <div className="max-w-4xl mx-auto px-4">
          <div className="font-display text-2xl text-cream-100 mb-3">🌿 Folilco Nativo</div>
          <p className="text-cream-500 text-sm mb-4">
            Km 12 Camino a Coñaripe · Región de Los Ríos · Chile
          </p>
          <div className="flex justify-center gap-6 text-sm text-cream-400 mb-6">
            <a href="mailto:hola@folilco.com" className="hover:text-honey-400 transition-colors">hola@folilco.com</a>
            <a href="https://wa.me/56912345678" className="hover:text-honey-400 transition-colors">WhatsApp</a>
            <Link href="/admin" className="hover:text-honey-400 transition-colors">Admin</Link>
          </div>
          <p className="text-cream-600 text-xs">
            © 2025 Cooperativa Folilco Nativo · Con ❤️ desde el sur de Chile
          </p>
        </div>
      </footer>
    </div>
  );
}
