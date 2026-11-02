# Portfolio de Ángel Menendez

Web oficial: [angelmzdev.github.io](https://angelmzdev.github.io/).

## Diseño con vídeo interactivo

El vídeo de presentación permanece pausado: el movimiento horizontal del ratón avanza o retrocede por su línea de tiempo. Se conserva un único salto de vídeo en curso para evitar saturar el decodificador. En pantallas táctiles puede arrastrarse horizontalmente; el desplazamiento vertical sigue navegando por la página.

La barra de posición también permite controlar el fotograma por teclado. El botón de pausa desactiva el seguimiento del puntero. La preferencia de reducir movimiento lo desactiva inicialmente, pero permite activarlo de forma explícita o explorar con la barra. No hay reproducción automática ni audio.

El archivo `assets/video/hero-scrub.mp4` procede del vídeo facilitado por el propietario. Se ha preparado en H.264 con fotogramas clave frecuentes, sin audio y con metadatos al inicio para facilitar la carga y la búsqueda. `hero-poster.jpg` ofrece una imagen mientras carga o si el vídeo no puede reproducirse.

La web usa HTML, CSS y JavaScript sin un paso de compilación ni dependencias de ejecución externas. Los proyectos y el resto del contenido están presentes en HTML, incluidos sin JavaScript. Las miniaturas son ilustraciones de proyecto.

## Copia anterior

Antes de este rediseño se conservó el estado completo en la rama [`backup/portfolio-antes-diseno-video-2026-11-02`](https://github.com/AngelmzDev/AngelmzDev.github.io/tree/backup/portfolio-antes-diseno-video-2026-11-02).

También se puede consultar la [versión anterior publicada](https://angelmzdev.github.io/version-anterior/), con una copia independiente de sus miniaturas. El pie de la web oficial enlaza a esa versión.

## Desarrollo local

El servidor de vista previa admite rangos de bytes, necesarios para comprobar los saltos interactivos del vídeo igual que en GitHub Pages. Con Node.js instalado, desde la raíz:

```shell
node scripts/serve.cjs
```

Abre `http://127.0.0.1:4174/`. La publicación se realiza con GitHub Pages desde la raíz de la rama `main`. Los cambios de la raíz actualizan la web oficial; `version-anterior/` es la copia conservada.
