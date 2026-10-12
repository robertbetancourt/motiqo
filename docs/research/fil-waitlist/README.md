# Investigación de FIL / waitlist

Referencia: [fil.design/waitlist](https://fil.design/waitlist). Inspección: 11 de octubre de 2026. Objetivo: entender la interfaz y su animación antes de implementar una réplica en Motiqo. Esta entrega solo añade documentación y capturas; no cambia los componentes de la web.

## Conclusión

Es una composición híbrida: React organiza la interfaz; Three.js r172 renderiza la escena; GLSL calcula los materiales y la atmósfera; otros dos canvases WebGL2 dibujan el metal líquido del formulario. Para reproducir su profundidad y respuesta necesitamos una escena WebGL, además de HTML y CSS. Confirmación del motor en el canvas y en el [bundle Three.js servido por FIL](https://fil.design/assets/three-pSrPYiX3.js).

![Composición de capítulos](C:/Users/Robert/OneDrive/Documentos/Proyects/Motiqo/docs/research/fil-waitlist/chapters.png)

## Evidencia y alcance

Se inspeccionaron DOM, CSS y módulos JavaScript públicos, y se probó navegación entre capítulos y rotación por arrastre. Las capturas documentan estados observados, no diseños recreados. La vista móvil se revisó con un viewport de 390 × 844; no equivale a una prueba en un teléfono físico.

**Confirmado** significa visible en la interfaz o presente en el código servido. **Propuesta** indica una decisión para nuestra futura implementación. No se dispone del repositorio original ni de sus herramientas de autoría. Tampoco se midieron FPS o memoria GPU. No se enviaron formularios ni se evaluó el backend.

## Organización de la interfaz

La escena ocupa un canvas fijo a pantalla completa. Encima hay una capa HTML fija: cabecera, espacio reservado para la tarjeta, textos/formulario, navegación lateral y enlaces legales. Una pista de scroll invisible contiene seis capítulos: invitación, imagen, video, 3D, código y vista conjunta. Hay cinco tarjetas; el último capítulo reúne esas mismas cinco. Esto se observó en el [DOM de la página](https://fil.design/waitlist).

El formulario y los textos de capítulo comparten área; sus opacidades cambian mediante variables CSS. La tarjeta mantiene proporción 2.5:3.5. Las secciones intermedias ocupan 175vh. Bajo 640px se ocultan el indicador lateral y el texto de acceso anticipado. La base es casi negra (#060607), con oro (#efb36c), rosa (#ef7d9b), azul (#82c1ee) y verde (#7fd18b). La interfaz usa Geist y Geist Mono. Los reveals HTML combinan opacidad, desenfoque y desplazamiento con una curva Bézier propia. Fuente: [CSS de waitlist](https://fil.design/assets/WaitlistPage-CJKNxDjz.css).

## Cómo se construye la tarjeta y la atmósfera

El [módulo compartido de arte, geometría y shaders](https://fil.design/assets/stir-BBdg5WcZ.js) confirma:

- Marco extruido con biseles, frente, reverso y abertura; gemas y conectores tienen geometría. Un stencil recorta el contenido interior.
- Canvas 2D dibuja ornamentación y tipografía Cinzel. Una textura RGBA empaqueta máscaras de oro, relieve suavizado, tinta y grabado.
- El shader combina esas máscaras con normales, dirección de vista y luz del cursor. Produce laca, reflejos, iridiscencia, microdestellos y barrido de revelado. El brillo cambia al girar la tarjeta.
- El fondo combina humo de ruido fractal deformado, haces radiales, motas y bokeh. Los hilos son mallas segmentadas deformadas en shaders.
- El cursor mueve un campo GPU de velocidad/desplazamiento: vorticidad, divergencia, presión y advección. Hay buffers alternados y doce iteraciones de presión. Ese campo desplaza el muestreo del humo; no es una simple mancha que sigue el ratón.

La imagen base de catedral se carga aparte de los efectos procedurales. Por eso recrear únicamente humo y partículas no dará el mismo fondo. La escena también referencia imágenes de galería, video y un modelo GLB para los capítulos posteriores. Fuente: [orquestación de la escena](https://fil.design/assets/scene-CGOwYdiH.js).

## Movimiento e interacción

El [controlador de escena](https://fil.design/assets/scene-CGOwYdiH.js) usa un bucle requestAnimationFrame propio. El scroll mueve la cámara entre tarjetas; la navegación lateral anima el scroll. La inclinación se suaviza exponencialmente: la cantidad interpolada depende de `1 − exp(−k·dt)`, con velocidades diferentes por efecto. Arrastrar añade rotación e inercia; doble clic solicita un giro al reverso. Conectores luminosos permiten avanzar. El contenido se revela con un barrido y una oscilación amortiguada. La vista final aleja la cámara y reorganiza dos tarjetas verticalmente.

También se limita inicialmente el pixel ratio a 2, puede reducirse cuando los cuadros tardan demasiado, y se calcula humo en un render target a media resolución. Hay disposición de geometrías, materiales, texturas y listeners. Se contempla pérdida de contexto WebGL y movimiento reducido. El código no constituye una medición de rendimiento ni garantiza accesibilidad completa.

![Estado después del arrastre](C:/Users/Robert/OneDrive/Documentos/Proyects/Motiqo/docs/research/fil-waitlist/card-rotation.png)

## Metal líquido del formulario

Es un sistema independiente de Three.js: [liquidMetal](https://fil.design/assets/liquidMetal-CwT82dGv.js) crea contextos WebGL2 con GLSL ES 3.0. Calcula una cápsula mediante una función de distancia, iluminación del borde, deformación local según posición/velocidad del cursor y ondas al presionar. Compone superficie, borde y resplandor mediante varias pasadas de suavizado. Hover, presión y cursor tienen interpolación temporal. Mantiene tres ondas superpuestas y libera recursos al desmontarse. Estos detalles se confirmaron en código; no se pulsó Join para probar un envío.

React monta y desmonta la escena y los efectos, carga módulos de forma diferida y sincroniza la interfaz con el progreso. El empaquetado muestra Vite/Rolldown. En los módulos de esta ruta inspeccionados no encontré GSAP, ScrollTrigger, Lenis ni React Three Fiber; la animación analizada tiene controladores propios. Fuentes: [entrada](https://fil.design/assets/index-BLAS4q6X.js) y [componente de página](https://fil.design/assets/WaitlistPage-C84RYZyu.js). Esto no prueba qué herramientas usa el resto del sitio.

## Propuesta para Motiqo

Primero conviene reproducir **la escena de invitación completa**: tarjeta con frente/reverso y profundidad, cubo, acabado holográfico, fondo atmosférico y controles con borde líquido. Es una primera unidad verificable. Los cinco capítulos y su cámara serían una segunda unidad, si queremos replicar también toda la narrativa del sitio.

La implementación puede conservar React/TypeScript y Next.js de Motiqo, usando Three.js directamente dentro de un componente cliente. El empaquetador del sitio de referencia no determina el aspecto.

Separaría las responsabilidades así:

1. `FilCardPreview`: contenedor React y HTML accesible; tamaño, pausa y configuración.
2. `createScene`: renderer, cámara, resize, calidad y limpieza.
3. `cardArtwork` y `cardGeometry`: patrones y textos editables separados del volumen.
4. `foilMaterial`: controles de oro, laca, intensidad y anchura de reflejos.
5. `atmosphere`: imagen base, humo, hilos y partículas con calidad configurable.
6. `pointerDynamics`: inclinación, arrastre, inercia y coordenadas locales.
7. `liquidControls`: efectos visuales independientes de la lógica del formulario.
8. `chapterController`: módulo opcional para la experiencia extensa por scroll.

La fidelidad se revisaría en reposo, inclinación, arrastre, reverso y transición, comparando encuadre, densidad de ornamentación, reflejos y fondo. Después se parametrizarían paleta, motivos, textos, contenido central y comportamiento. Reducirlo desde el principio a un rectángulo CSS con gradiente perdería la abertura, el grosor y la relación entre luz y superficie.

## Qué falta decidir antes de implementar

Elegir si la primera réplica abarca la invitación o los seis capítulos. Acordar el arte y la imagen de fondo que se usarán en la versión de Motiqo, y el contenido interior de la tarjeta. Definir el tamaño de preview y el presupuesto de calidad en móvil. No hace falta resolver estas decisiones para dar por terminada esta investigación.

## Referencias visuales

- [Invitación](C:/Users/Robert/OneDrive/Documentos/Proyects/Motiqo/docs/research/fil-waitlist/invitation.png)
- [Vista conjunta](C:/Users/Robert/OneDrive/Documentos/Proyects/Motiqo/docs/research/fil-waitlist/chapters.png)
- [Rotación](C:/Users/Robert/OneDrive/Documentos/Proyects/Motiqo/docs/research/fil-waitlist/card-rotation.png)
- [Móvil](C:/Users/Robert/OneDrive/Documentos/Proyects/Motiqo/docs/research/fil-waitlist/mobile.png)

Los nombres de bundles corresponden a la versión observada en la fecha de inspección y pueden cambiar. Los bundles de terceros se estudiaron temporalmente; no se incorporaron como implementación de Motiqo.
