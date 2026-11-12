# Portfolio de Ángel Menendez

Web oficial: [angelmzdev.github.io](https://angelmzdev.github.io/).

## Personaje que sigue al cursor

El personaje de la portada mira hacia donde está el ratón (o el dedo, arrastrando en horizontal en pantallas táctiles; el desplazamiento vertical sigue navegando por la página). La dirección se calcula respecto a la posición real de su cabeza en pantalla, con un muelle amortiguado para que el giro sea suave y un ligero parallax de fondo. Si el cursor sale de la ventana, vuelve a mirar al frente.

Las poses están en `assets/gaze/` (11 WebP, ~320 KB) y se pintan en un `<canvas>` con un fundido corto entre poses vecinas. Se extraen del vídeo original `assets/video/hero-scrub.mp4` con `sh scripts/build-gaze-frames.sh` (requiere ffmpeg), ordenadas de izquierda a derecha y sin parpadeos. Si se cambia el vídeo, hay que ajustar la lista de fotogramas del script y los ángulos de `GAZE_POSES` en `assets/portfolio.js`.

La barra permite controlar la mirada por teclado. El botón de pausa desactiva el seguimiento del puntero. La preferencia de reducir movimiento lo desactiva inicialmente (y siempre quita el parallax). `hero-poster.jpg` se muestra mientras cargan las poses o si fallan.

La web usa HTML, CSS y JavaScript sin un paso de compilación ni dependencias de ejecución externas. Los proyectos y el resto del contenido están presentes en HTML, incluidos sin JavaScript. Las miniaturas son ilustraciones de proyecto.

## Copia anterior

Antes de este rediseño se conservó el estado completo en la rama [`backup/portfolio-antes-diseno-video-2026-11-02`](https://github.com/AngelmzDev/AngelmzDev.github.io/tree/backup/portfolio-antes-diseno-video-2026-11-02).

También se puede consultar la [versión anterior publicada](https://angelmzdev.github.io/version-anterior/), con una copia independiente de sus miniaturas. El pie de la web oficial enlaza a esa versión.

## Desarrollo local

Con Node.js instalado, desde la raíz:

```shell
node scripts/serve.cjs
```

Abre `http://127.0.0.1:4174/`. La publicación se realiza con GitHub Pages desde la raíz de la rama `main`. Los cambios de la raíz actualizan la web oficial; `version-anterior/` es la copia conservada.
