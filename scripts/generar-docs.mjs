#!/usr/bin/env node
/**
 * Genera la referencia de la API pública de CuFlora a partir del OpenAPI
 * (ADR-0015 del backend). No se edita a mano lo que este script escribe.
 *
 *   node scripts/generar-docs.mjs [--commit <sha>]
 *
 * Entrada:  desarrolladores/openapi.json   (lo exporta el CI del backend)
 * Salida:   desarrolladores/referencia/index.html y una página por etiqueta
 *
 * Sin dependencias: HTML estático con el CSS del portal (assets/estilos.css y
 * assets/desarrolladores.css). Funciona sin JavaScript.
 */
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const ENTRADA = join(RAIZ, 'desarrolladores', 'openapi.json');
const SALIDA = join(RAIZ, 'desarrolladores', 'referencia');
const BASE = 'https://cuflora.kawi.page';

const arg = (nombre) => {
    const i = process.argv.indexOf(nombre);
    return i > -1 ? process.argv[i + 1] : undefined;
};
const commit = (arg('--commit') ?? process.env.GITHUB_SHA ?? 'local').slice(0, 7);

/** Orden y textos de cada etiqueta. Una etiqueta nueva en el OpenAPI sale al final. */
const ETIQUETAS = {
    'Plantas': { slug: 'plantas', intro: 'Los ejemplares registrados: listado, detalle, búsqueda y exportación.' },
    'Taxonomía': { slug: 'taxonomia', intro: 'Familias, géneros y especies. Cada nivel se puede listar y consultar por id.' },
    'Mapas': { slug: 'mapas', intro: 'Mapas de flora sobre ortofotos georreferenciadas, y exportación de sus plantas y reportes.' },
    'Reportes': { slug: 'reportes', intro: 'Observaciones de campo, sus categorías, mediciones y fotos.' },
    'Imágenes': { slug: 'imagenes', intro: 'Archivos de fotos y ortofotos. No piden llave.' },
};
const TIPOS = {
    lista: 'Lista paginada',
    detalle: 'Un registro',
    busqueda: 'Búsqueda paginada',
    exportacion: 'Archivo CSV · 10 por hora por llave',
    abierta: 'Abierta · sin llave',
};
const EJEMPLO_PARAM = { id: '1', mapId: '1', zoneId: '2', placementId: '1' };

const esc = (texto) => String(texto ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

/** `código` → <code>, igual que en las descripciones del catálogo. */
const enLinea = (texto) => esc(texto).replace(/`([^`]+)`/g, '<code>$1</code>');

const slugDe = (etiqueta) => ETIQUETAS[etiqueta]?.slug
    ?? etiqueta.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-');
const anclaDe = (metodo, ruta) => `${metodo}${ruta}`.toLowerCase().replace(/[{}]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/-$/, '');

function plantilla({ titulo, descripcion, raiz, actual, migas, h1, lead, cuerpo }) {
    return `<!DOCTYPE html>
<html lang="es-MX">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(titulo)}</title>
<meta name="description" content="${esc(descripcion)}">
<meta name="theme-color" content="#A6F750">
<link rel="icon" type="image/svg+xml" href="${raiz}assets/cuflora.svg">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@62..125,100..900&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${raiz}assets/estilos.css">
<link rel="stylesheet" href="${raiz}assets/desarrolladores.css">
</head>
<body>

<header>
  <div class="wrap nav">
    <a class="marca" href="${raiz}"><img src="${raiz}assets/cuflora.svg" alt="Logo de CuFlora">CuFlora</a>
    <div class="nav-der">
      <nav class="nav-links" aria-label="Desarrolladores">
        <a href="${raiz}">Inicio</a>
        <a href="${raiz}desarrolladores/"${actual === 'guia' ? ' aria-current="page"' : ''}>Guía</a>
        <a href="${raiz}desarrolladores/referencia/"${actual === 'referencia' ? ' aria-current="page"' : ''}>Referencia</a>
      </nav>
      <a class="btn-nav" href="${raiz}desarrolladores/#llave">Obtener llave</a>
    </div>
  </div>
</header>

<main>
  <div class="hero doc-hero">
    <div class="wrap hero-int">
      <p class="migas mono">${migas}</p>
      <h1>${esc(h1)}</h1>
      <p class="lead">${lead}</p>
    </div>
  </div>
${cuerpo}
</main>

<footer>
  <div class="wrap foot">
    <span class="mono generada">Generada desde master @${esc(commit)} · <a href="${raiz}desarrolladores/openapi.json">openapi.json</a></span>
    <span class="mono">CuFlora © 2026 · <a href="mailto:claudio.rodriguez4333@alumnos.udg.mx?subject=API%20CuFlora">Contacto</a></span>
  </div>
</footer>

</body>
</html>
`;
}

function urlEjemplo(ruta, op) {
    let url = BASE + ruta.replace(/\{(\w+)\}/g, (_, nombre) => EJEMPLO_PARAM[nombre] ?? '1');
    if (op['x-tipo'] === 'lista') url += '?pageSize=100';
    if (op['x-tipo'] === 'busqueda') url += '?term=agave';
    return url;
}

function ejemplos(metodo, ruta, op) {
    const url = urlEjemplo(ruta, op);
    const abierta = op['x-tipo'] === 'abierta';
    const csv = op['x-tipo'] === 'exportacion';
    const archivo = csv ? 'cuflora.csv' : abierta ? 'imagen' : null;

    const curl = [
        `curl${abierta ? '' : ' -H "Authorization: Bearer $CUFLORA_KEY"'} \\`,
        `  "${url}"${archivo ? ` \\\n  -o ${archivo}` : ''}`,
    ].join('\n');

    const python = [
        'import os, requests',
        '',
        `r = requests.get("${url}"${abierta ? '' : ',\n                 headers={"Authorization": f"Bearer {os.environ[\'CUFLORA_KEY\']}"}'})`,
        'r.raise_for_status()',
        csv ? 'open("cuflora.csv", "wb").write(r.content)' : abierta ? 'open("imagen", "wb").write(r.content)' : 'datos = r.json()',
    ].join('\n');

    const js = [
        `const r = await fetch("${url}"${abierta ? '' : ', {\n  headers: { Authorization: `Bearer ${process.env.CUFLORA_KEY}` },\n}'});`,
        'if (!r.ok) throw new Error(`HTTP ${r.status}`);',
        csv ? 'const csv = await r.text();' : abierta ? 'const imagen = await r.arrayBuffer();' : 'const datos = await r.json();',
    ].join('\n');

    return `<div class="ejemplos">
              <details open><summary>curl</summary><pre class="codigo">${esc(curl)}</pre></details>
              <details><summary>Python</summary><pre class="codigo">${esc(python)}</pre></details>
              <details><summary>JavaScript</summary><pre class="codigo">${esc(js)}</pre></details>
            </div>`;
}

function tablaParametros(op) {
    const params = op.parameters ?? [];
    if (!params.length) return '';
    const filas = params.map((p) => {
        const tipo = p.schema?.type ?? (p.schema?.enum ? 'enum' : 'string');
        const extra = p.schema?.enum ? ` (${p.schema.enum.join(', ')})` : '';
        return `<tr><th scope="row">${esc(p.name)}</th><td class="tipo">${esc(p.in === 'path' ? 'ruta' : 'consulta')} · ${esc(tipo)}</td><td>${enLinea(p.description ?? '')}${esc(extra)}${p.required ? ' <b>Obligatorio.</b>' : ''}</td></tr>`;
    }).join('\n                ');
    return `<table class="params">
              <caption>Parámetros</caption>
              <tbody>
                ${filas}
              </tbody>
            </table>`;
}

function chips(titulo, valores, formato) {
    if (!valores?.length) return '';
    return `<div><span class="chips-titulo">${esc(titulo)}</span><div class="chips">${valores.map((v) => `<code>${esc(formato(v))}</code>`).join('')}</div></div>`;
}

function respuesta(op) {
    const contenido = op.responses?.['200']?.content;
    if (!contenido) return '';
    const [tipo, valor] = Object.entries(contenido)[0];
    const ejemplo = valor?.example;
    if (ejemplo === undefined) return '';
    const texto = typeof ejemplo === 'string' ? ejemplo : JSON.stringify(ejemplo, null, 2);
    return `<div><span class="chips-titulo">Respuesta 200 · ${esc(tipo)} · ejemplo</span><pre class="codigo">${esc(texto)}</pre></div>`;
}

function operacion(metodo, ruta, op, abierta) {
    const permisos = op['x-permisos']?.length ? op['x-permisos'].map((p) => `<code>${esc(p)}</code>`).join(' ') : 'Ninguno';
    return `
        <details id="${anclaDe(metodo, ruta)}"${abierta ? ' open' : ''}>
          <summary><span class="clave"><span class="metodo">${esc(metodo.toUpperCase())}</span></span><h3><span class="ruta">${esc(ruta)}</span><span class="res">${esc(op.summary)}</span></h3><span class="marcador" aria-hidden="true">+</span></summary>
          <div class="cuerpo">
            <p>${enLinea(op.description)}</p>
            <dl class="ficha">
              <dt>Tipo</dt><dd>${esc(TIPOS[op['x-tipo']] ?? op['x-tipo'] ?? '')}</dd>
              <dt>Permiso</dt><dd>${permisos}</dd>
            </dl>
            ${tablaParametros(op)}
            ${chips('Filtros · fi.<campo>_<op>=valor', op['x-filtros'], (f) => `fi.${f}_eq`)}
            ${chips('Includes · in.<relación>=true', op['x-includes'], (i) => `in.${i}=true`)}
            ${respuesta(op)}
            ${ejemplos(metodo, ruta, op)}
          </div>
        </details>`;
}

function agrupar(doc) {
    const grupos = new Map();
    for (const [ruta, item] of Object.entries(doc.paths ?? {})) {
        for (const [metodo, op] of Object.entries(item)) {
            if (!op?.responses) continue;
            const etiqueta = op.tags?.[0] ?? 'Otros';
            if (!grupos.has(etiqueta)) grupos.set(etiqueta, []);
            grupos.get(etiqueta).push({ metodo, ruta, op });
        }
    }
    // Dentro de cada grupo, como lo leería alguien nuevo: listar, buscar, ver uno y al final exportar.
    const ordenTipo = ['lista', 'busqueda', 'detalle', 'abierta', 'exportacion'];
    const posicion = ({ op, ruta }) => ordenTipo.indexOf(op['x-tipo']) * 1000 + ruta.length;
    for (const ops of grupos.values()) ops.sort((a, b) => posicion(a) - posicion(b));
    const orden = Object.keys(ETIQUETAS);
    return [...grupos.entries()].sort(([a], [b]) => {
        const ia = orden.indexOf(a), ib = orden.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b);
    });
}

function paginaEtiqueta(etiqueta, ops) {
    const intro = ETIQUETAS[etiqueta]?.intro ?? '';
    const indice = ops.map(({ metodo, ruta }) => `<li><a href="#${anclaDe(metodo, ruta)}">${esc(metodo.toUpperCase())} ${esc(ruta)}</a></li>`).join('\n          ');
    const cuerpo = `
  <section class="panel">
    <div class="wrap sec-grid">
      <div>
        <h2>${esc(etiqueta)}</h2>
        <p class="intro">${esc(intro)}</p>
        <ul class="indice">
          ${indice}
        </ul>
      </div>
      <div class="acc ref">${ops.map(({ metodo, ruta, op }, i) => operacion(metodo, ruta, op, i === 0)).join('')}
      </div>
    </div>
  </section>`;
    return plantilla({
        titulo: `${etiqueta} · API de CuFlora`,
        descripcion: `Referencia de la API pública de CuFlora: ${intro}`,
        raiz: '../../',
        actual: 'referencia',
        migas: `<a href="../">Desarrolladores</a> / <a href="./">Referencia</a> / ${esc(etiqueta)}`,
        h1: etiqueta,
        lead: esc(`${ops.length} ${ops.length === 1 ? 'operación' : 'operaciones'} de solo lectura. ${intro}`),
        cuerpo,
    });
}

function paginaIndice(grupos, doc) {
    const total = grupos.reduce((n, [, ops]) => n + ops.length, 0);
    const filas = grupos.map(([etiqueta, ops]) => `
          <li><a href="${slugDe(etiqueta)}.html"><div><strong>${esc(etiqueta)}</strong><span>${esc(ETIQUETAS[etiqueta]?.intro ?? '')}</span></div><span class="mono">${ops.length} ${ops.length === 1 ? 'operación' : 'operaciones'}</span></a></li>`).join('');
    const cuerpo = `
  <section class="panel">
    <div class="wrap sec-grid">
      <div>
        <h2>Referencia</h2>
        <p class="intro">Todas las operaciones son de lectura y piden una llave de API, salvo las de imágenes. Servidor: <code>${esc(doc.servers?.[0]?.url ?? BASE)}</code>.</p>
      </div>
      <ul class="ref-lista">${filas}
      </ul>
    </div>
  </section>`;
    return plantilla({
        titulo: 'Referencia · API de CuFlora',
        descripcion: 'Referencia de la API pública de solo lectura de CuFlora, generada desde el código.',
        raiz: '../../',
        actual: 'referencia',
        migas: '<a href="../">Desarrolladores</a> / Referencia',
        h1: 'Referencia de la API',
        lead: esc(`${total} operaciones en ${grupos.length} grupos. Esta página se genera sola desde el código del gateway en cada cambio.`),
        cuerpo,
    });
}

const doc = JSON.parse(readFileSync(ENTRADA, 'utf8'));
const grupos = agrupar(doc);

// Se regenera todo: una etiqueta que desaparece no deja una página huérfana.
rmSync(SALIDA, { recursive: true, force: true });
mkdirSync(SALIDA, { recursive: true });
writeFileSync(join(SALIDA, 'index.html'), paginaIndice(grupos, doc));
for (const [etiqueta, ops] of grupos) {
    writeFileSync(join(SALIDA, `${slugDe(etiqueta)}.html`), paginaEtiqueta(etiqueta, ops));
}
console.log(`✓ ${grupos.length} páginas de referencia (${grupos.reduce((n, [, o]) => n + o.length, 0)} operaciones) en ${SALIDA}: ${readdirSync(SALIDA).join(', ')}`);
