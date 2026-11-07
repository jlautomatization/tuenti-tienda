# TUENTI — sitio web

Sitio estático que lee todo su contenido de `marca.json`. El HTML no lleva texto de
negocio: solo estructura y contenedores vacíos.

## Cómo verlo (hace falta servidor local)

`app.js` carga los datos con `fetch('marca.json')`. **Sobre `file://` eso falla por
CORS**, así que abrir `index.html` con doble clic muestra una pantalla de error. Hay
que servirlo por HTTP.

El servidor tiene que arrancar en la **raíz del proyecto** (la carpeta que contiene
`web/` y `export-boutique/`), porque `index.html` enlaza los CSS del sistema con
`../export-boutique/`.

```bash
# desde:  ...\ropa-tienda computador\
python -m http.server 8765 --bind 127.0.0.1
```

Y abre: **http://127.0.0.1:8765/web/index.html**

Alternativas equivalentes:

```bash
npx serve -l 8765 .            # Node
php -S 127.0.0.1:8765          # PHP
```

En VS Code también sirve la extensión *Live Server*, con la raíz puesta en la carpeta
del proyecto (no en `web/`).

## Estructura

```
ropa-tienda computador/
├─ export-boutique/
│  ├─ tokens.css          variables del sistema, adaptadas a la identidad F0
│  └─ componentes.css     componentes ds-*
└─ web/
   ├─ index.html          portada. Selección corta del catálogo + «ver más»
   ├─ catalogo.html       grilla completa + filtro por categoría
   ├─ marca.json          TODO el contenido variable
   ├─ app.js              carga marca.json y renderiza las dos páginas
   ├─ tienda.css/.js      módulo de carrito, checkout y registro (del export)
   ├─ animaciones/        video del modal de registro
   └─ img/                fotos optimizadas para la grilla
      └─ full/            versión mayor, para el visor ampliado
```

## Imágenes

Las fotos originales viven en `TUENTI originales/` y **no se tocan**. `web/img/`
contiene versiones optimizadas generadas con ffmpeg.

Ojo: 216 de los 266 archivos originales son **HEIC con extensión `.png`**, y ningún
navegador de escritorio los abre. Por eso la conversión no es opcional.

```bash
# original -> png intermedio -> jpg optimizado (dos pasadas: los HEIC llevan tile grid
# y `-vf scale` falla si se hace en una sola)
ffmpeg -y -i "origen.png" intermedio.png
ffmpeg -y -i intermedio.png -vf "scale='min(760,iw)':-2"  -q:v 6 web/img/destino.jpg
ffmpeg -y -i intermedio.png -vf "scale='min(1400,iw)':-2" -q:v 5 web/img/full/destino.jpg
```

## Editar el contenido

Todo está en `marca.json`. Un solo punto de edición:

- `tokens` — sobrescribe las custom properties de `tokens.css` al cargar.
- `marca`, `anuncio`, `nav`, `hero`, `coleccion`, `destacado`, `historia`,
  `promesas`, `local`, `contacto`, `redes`, `pie` — los textos de cada sección.
- `categorias` — fija el orden de los grupos en la grilla.
- `productos` — un bloque por **diseño**, con sus `variantes` (color + tallas + fotos).

### Dos reglas que aplica el código

**Campos faltantes.** Si un campo viene `null` o vacío, se pinta `[[campo]]` en rojo
con borde punteado. No hay texto de relleno. Hoy hay 58 marcadores en la página: son
los datos que faltan por confirmar.

**Filtro de publicables.** `index.html` excluye por código todo producto con
`licenciado: true` o `publicable_web: false`. Es un filtro en el render, no un
criterio manual. Al cargar, la consola informa cuántos quedaron fuera.

## Catálogo

`catalogo.html` usa el mismo `app.js`, que detecta la página por los contenedores
del DOM. El filtro por categoría es de una sola selección y no recarga: reconstruye
la grilla y refleja la elección en el hash (`catalogo.html#Oversize`), así que el
enlace se puede compartir. Los atajos de categoría de la portada apuntan ahí.

Las categorías y su orden salen de `marca.json` → `categorias`. Si una queda sin
referencias publicables, se muestra un mensaje con botón de vuelta, nunca una
grilla en blanco.

## Estado

Construidos: `index.html`, `catalogo.html`.
Pendiente: `producto.html`.
