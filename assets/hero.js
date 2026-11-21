// Hero: la mira recorre la ortofoto y coloca cada agave como en la app, con su ficha.
// Sin JS o con movimiento reducido se ven los 25 marcadores puestos y la primera ficha.
const P = [{"n": "Agave lophantha", "x": 60.26, "y": 30.88, "lat": "20.540420", "lng": "-103.965750"}, {"n": "Agave demeesteriana", "x": 63.81, "y": 32.17, "lat": "20.540410", "lng": "-103.965700"}, {"n": "agave azul, maguey tequilero", "x": 68.07, "y": 36.12, "lat": "20.540380", "lng": "-103.965640"}, {"n": "maguey espadín", "x": 69.51, "y": 42.76, "lat": "20.540330", "lng": "-103.965620"}, {"n": "maguey americano", "x": 71.65, "y": 45.41, "lat": "20.540310", "lng": "-103.965590"}, {"n": "lechuguilla", "x": 72.37, "y": 48.06, "lat": "20.540290", "lng": "-103.965580"}, {"n": "agave pulpo", "x": 66.71, "y": 52.13, "lat": "20.540260", "lng": "-103.965660"}, {"n": "maguey relisero", "x": 64.58, "y": 50.82, "lat": "20.540270", "lng": "-103.965690"}, {"n": "agave", "x": 63.16, "y": 49.51, "lat": "20.540280", "lng": "-103.965710"}, {"n": "espadín, rabo de león", "x": 61.74, "y": 48.19, "lat": "20.540290", "lng": "-103.965730"}, {"n": "agave hilo", "x": 59.62, "y": 49.55, "lat": "20.540280", "lng": "-103.965760"}, {"n": "maguey manso", "x": 58.93, "y": 54.89, "lat": "20.540240", "lng": "-103.965770"}, {"n": "maguey", "x": 57.51, "y": 56.23, "lat": "20.540230", "lng": "-103.965790"}, {"n": "agave", "x": 56.83, "y": 62.9, "lat": "20.540180", "lng": "-103.965800"}, {"n": "agave", "x": 55.42, "y": 65.58, "lat": "20.540160", "lng": "-103.965820"}, {"n": "papalote, maguey ancho", "x": 58.98, "y": 70.87, "lat": "20.540120", "lng": "-103.965770"}, {"n": "Agave shrevei subsp. magna", "x": 60.4, "y": 70.86, "lat": "20.540120", "lng": "-103.965750"}, {"n": "lechuguilla, raicilla", "x": 66.8, "y": 76.12, "lat": "20.540080", "lng": "-103.965660"}, {"n": "maguey de Guadalajara", "x": 68.88, "y": 64.1, "lat": "20.540170", "lng": "-103.965630"}, {"n": "maguey bravo", "x": 68.17, "y": 62.77, "lat": "20.540180", "lng": "-103.965640"}, {"n": "Agave martaelenae", "x": 72.43, "y": 65.4, "lat": "20.540160", "lng": "-103.965580"}, {"n": "masparillo, tepe", "x": 74.59, "y": 76.03, "lat": "20.540080", "lng": "-103.965550"}, {"n": "Agave difformis", "x": 63.88, "y": 53.49, "lat": "20.540250", "lng": "-103.965700"}, {"n": "Agave abisaii", "x": 61.0, "y": 41.54, "lat": "20.540340", "lng": "-103.965740"}, {"n": "maguey pitzómetl", "x": 58.87, "y": 40.22, "lat": "20.540350", "lng": "-103.965770"}];
const campo = document.getElementById('campo');
if (campo && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const marcas = [...campo.querySelectorAll('.lienzo i')];
  const mira = campo.querySelector('.mira');
  const ficha = document.querySelector('.ficha');
  const [nombre, , , , coords] = [ficha.querySelector('b'), ...ficha.querySelectorAll('dt, dd')];
  const nota = ficha.querySelector('p');
  let i = 0, timer = 0, visible = false;
  campo.classList.add('anima');

  const paso = () => {
    if (i === P.length) {                      // terminó el recorrido: pausa y vuelve a empezar
      marcas.forEach(m => m.classList.remove('puesto', 'activo'));
      i = 0;
      timer = setTimeout(paso, 600);
      return;
    }
    const p = P[i];
    mira.style.setProperty('--x', p.x + '%');
    mira.style.setProperty('--y', p.y + '%');
    timer = setTimeout(() => {
      marcas.forEach(m => m.classList.remove('activo'));
      marcas[i].classList.add('puesto', 'activo');
      nombre.textContent = p.n;
      coords.textContent = p.lat + ', ' + p.lng.replace('-', '−');
      nota.textContent = (i + 1) + ' de ' + P.length + ' agaves ubicados';
      ficha.classList.remove('cambia'); void ficha.offsetWidth; ficha.classList.add('cambia');
      i++;
      timer = setTimeout(paso, i === P.length ? 3500 : 1500);
    }, 950);
  };
  // Solo anima mientras el campo está a la vista
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && !visible) { visible = true; paso(); }
    else if (!e.isIntersecting && visible) { visible = false; clearTimeout(timer); }
  }).observe(campo);
}

// Carrusel de pantallas: flechas, contador y teclado; el deslizamiento táctil es nativo (scroll-snap).
const carr = document.querySelector('.carrusel');
if (carr) {
  const diapos = carr.querySelectorAll('.diapo');
  const cuenta = document.querySelector('.carr-cuenta');
  const [antes, despues] = document.querySelectorAll('.carr-btn');
  const actual = () => Math.round(carr.scrollLeft / carr.clientWidth);
  const ir = i => carr.scrollTo({ left: i * carr.clientWidth, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  const pinta = () => {
    const i = actual();
    cuenta.textContent = (i + 1) + ' / ' + diapos.length;
    antes.disabled = i === 0;
    despues.disabled = i === diapos.length - 1;
  };
  antes.addEventListener('click', () => ir(actual() - 1));
  despues.addEventListener('click', () => ir(actual() + 1));
  carr.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight') { e.preventDefault(); ir(actual() + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); ir(actual() - 1); }
  });
  carr.addEventListener('scroll', pinta, { passive: true });
  pinta();
}

// Entradas: la diapositiva visible del carrusel anima su teléfono y sus acciones;
// las filas de "Qué es" y "Lo que hay detrás" aparecen una a una la primera vez que se ven.
if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
  const carrusel = document.querySelector('.carrusel');
  if (carrusel) {
    carrusel.querySelectorAll('.acciones').forEach(ul => ul.querySelectorAll('li').forEach((li, n) => li.style.setProperty('--n', n)));
    const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('activa', e.isIntersecting)), { root: carrusel, threshold: 0.6 });
    carrusel.querySelectorAll('.diapo').forEach(d => io.observe(d));
    carrusel.classList.add('vivo');
  }
  const vistas = new IntersectionObserver(es => es.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('visto'); vistas.unobserve(e.target); }
  }), { threshold: 0.2 });
  document.querySelectorAll('.defs').forEach(dl => {
    dl.querySelectorAll(':scope > div').forEach((d, n) => d.style.setProperty('--n', n));
    dl.classList.add('revela');
    vistas.observe(dl);
  });
}

// Arquitectura: peticiones de ejemplo al azar recorren su ruta real (app → NGINX → gateway → servicios)
// mientras el diagrama está a la vista.
const RECORRIDOS = [{"t": "Reportar una planta", "ruta": "reportes plantas notificaciones", "d": "El gateway revisa el token y el permiso para reportar; Reportes guarda la observación, Plantas y mapas dice en qué zona y mapa está el ejemplar, y Notificaciones avisa a quien los sigue."}, {"t": "Iniciar sesión", "ruta": "usuarios", "d": "Usuarios verifica la contraseña y emite el token; desde ahí el gateway lo valida en cada petición."}, {"t": "Registrar una planta", "ruta": "plantas", "d": "El gateway revisa el permiso para crear plantas; Plantas y mapas guarda el ejemplar con su especie y su lugar en el mapa."}, {"t": "Subir una foto", "ruta": "imagenes", "d": "Imágenes recibe la foto, guarda quién la subió y a qué hora se tomó, y la procesa para el teléfono."}, {"t": "Abrir el mapa", "ruta": "plantas imagenes", "d": "Plantas y mapas entrega las zonas y los ejemplares; Imágenes entrega la ortofoto del jardín."}];
const diagrama = document.querySelector('.diagrama');
if (diagrama) {
  const titulo = document.querySelector('.rec-actual b');
  const texto = document.querySelector('.rec-texto');
  const nodo = k => diagrama.querySelector(`.servicios [data-svc="${k}"]`);
  let timers = [], previo = 0, activo = false;
  const muestra = r => {
    timers.forEach(clearTimeout); timers = [];
    diagrama.querySelectorAll('.llega').forEach(n => n.classList.remove('llega'));
    titulo.textContent = r.t;
    texto.textContent = r.d;
  };
  const siguiente = () => {
    let n;
    do { n = Math.floor(Math.random() * RECORRIDOS.length); } while (n === previo);  // nunca el mismo dos veces seguidas
    previo = n;
    const r = RECORRIDOS[n], ruta = r.ruta.split(' ');
    muestra(r);
    diagrama.classList.remove('viaja'); void diagrama.offsetWidth; diagrama.classList.add('viaja');
    // la petición tarda 1.56 s en llegar al gateway; luego enciende cada servicio en orden
    ruta.forEach((k, i) => timers.push(setTimeout(() => nodo(k).classList.add('llega'), 1560 + i * 450)));
    timers.push(setTimeout(() => activo && siguiente(), 1560 + ruta.length * 450 + 3200));
  };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
    RECORRIDOS[0].ruta.split(' ').forEach(k => nodo(k).classList.add('llega'));   // fijo: el primer ejemplo encendido
  } else {
    new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !activo) { activo = true; siguiente(); }
      else if (!e.isIntersecting && activo) { activo = false; timers.forEach(clearTimeout); }
    }, { threshold: 0.4 }).observe(diagrama);
  }
}
