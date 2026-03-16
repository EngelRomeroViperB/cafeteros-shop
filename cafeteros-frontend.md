+-----------------------------------------------------------------------+
| **🛒 CAFETEROS SHOP**                                                 |
|                                                                       |
| **Cómo funciona el Frontend**                                         |
|                                                                       |
| Guía de lógica visual para el modelo de IA                            |
+-----------------------------------------------------------------------+

Este documento describe CÓMO debe comportarse visualmente cada parte del
frontend de la tienda. Es una guía de lógica, no de código. El objetivo
es que el modelo de IA entienda exactamente qué debe mostrar, cuándo y
por qué.

**1. El Problema --- Por Qué Solo Se Ve Una Imagen**

Una tienda online normal NO guarda una sola URL de imagen en el
producto. Guarda una lista de imágenes. El error más común es tratar la
imagen como un campo de texto simple en lugar de una relación de tabla.

  ----------------------------------- -----------------------------------
  **Enfoque INCORRECTO ❌**           **Enfoque CORRECTO ✅**

  products.image_url =                tabla product_images con N filas
  \"https://\...\"                    por producto

  Siempre muestra la misma URL        Muestra la imagen marcada como
                                      is_primary=true

  No hay galería posible              Galería completa ordenada por
                                      sort_order

  Las variantes no tienen imagen      Cada variante tiene su propia tabla
  propia                              variant_images

  Cambiar imagen = editar el producto Subir nueva fila a product_images
  ----------------------------------- -----------------------------------

**2. Página de Catálogo --- Cómo Funciona**

La página de catálogo muestra tarjetas de producto (ProductCard). Cada
tarjeta debe comportarse así:

**2.1 Tarjeta de Producto (ProductCard)**

+---+------------------------------------------------------------------+
| * | **Qué imagen mostrar en la tarjeta**                             |
| * |                                                                  |
| 1 | Buscar en product_images del producto la que tenga is_primary =  |
| * | true.                                                            |
| * |                                                                  |
|   | Si ninguna tiene is_primary = true, usar la primera del arreglo  |
|   | (sort_order más bajo).                                           |
|   |                                                                  |
|   | Si no hay ninguna imagen, mostrar un placeholder local           |
|   | (/placeholder.jpg).                                              |
|   |                                                                  |
|   | NUNCA hardcodear una URL. NUNCA usar siempre images\[0\] sin     |
|   | verificar is_primary.                                            |
+---+------------------------------------------------------------------+

+---+------------------------------------------------------------------+
| * | **Qué precio mostrar**                                           |
| * |                                                                  |
| 2 | Mostrar el base_price del producto.                              |
| * |                                                                  |
| * | Si el producto tiene variantes con price_override, mostrar       |
|   | \"Desde \$X\" donde X es el menor precio.                        |
|   |                                                                  |
|   | Si base_price es 0 o null, mostrar \"Precio a consultar\".       |
+---+------------------------------------------------------------------+

+---+------------------------------------------------------------------+
| * | **Comportamiento hover en la tarjeta (desktop)**                 |
| * |                                                                  |
| 3 | Al pasar el mouse: mostrar la segunda imagen del producto si     |
| * | existe (efecto flip/crossfade).                                  |
| * |                                                                  |
|   | Si solo hay una imagen, mantenerla igual.                        |
|   |                                                                  |
|   | Mostrar botón \"Ver producto\" o \"Añadir rápido\" superpuesto.  |
+---+------------------------------------------------------------------+

+---+------------------------------------------------------------------+
| * | **Comportamiento tap en mobile**                                 |
| * |                                                                  |
| 4 | Un tap en la tarjeta navega al detalle del producto.             |
| * |                                                                  |
| * | NO hay hover en mobile. El efecto flip solo aplica en desktop.   |
|   |                                                                  |
|   | El botón de acción rápida puede aparecer en la parte inferior de |
|   | la tarjeta siempre visible.                                      |
+---+------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Pseudocódigo --- lógica de imagen principal**                       |
|                                                                       |
| // LÓGICA CORRECTA para obtener imagen principal                      |
|                                                                       |
| function getPrimaryImage(product_images) {                            |
|                                                                       |
| if (!product_images \|\| product_images.length === 0)                 |
|                                                                       |
| return \"/placeholder.jpg\";                                          |
|                                                                       |
| const primary = product_images.find(img =\> img.is_primary === true); |
|                                                                       |
| const image = primary ?? product_images\[0\]; // fallback a primera   |
|                                                                       |
| return buildStorageUrl(image.storage_key);                            |
|                                                                       |
| // buildStorageUrl convierte el storage_key a URL pública de Supabase |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**2.2 Filtros del Catálogo**

El catálogo debe permitir filtrar sin recargar la página (client-side
filtering sobre los datos ya cargados).

  --------------- ------------------------------- -----------------------
  **Filtro**      **Cómo funciona**               **Dónde vive el
                                                  estado**

  Por categoría   Mostrar solo productos donde    URL query param
                  category.slug coincide          ?categoria=camisetas

  Por género      Mostrar productos que tienen    Estado local (useState)
                  variantes del género elegido    

  Por talla       Mostrar productos que tienen    Estado local (useState)
                  stock en esa talla              

  Por precio      Rango min-max sobre base_price  Estado local (useState)

  Ordenar         Más vendido / Precio asc /      Estado local (useState)
                  Precio desc / Nuevo             
  --------------- ------------------------------- -----------------------

**3. Página de Detalle --- Cómo Funciona**

Esta es la página más importante. Tiene 3 zonas principales: galería de
imágenes, información + selector de variante, y descripción/tabs.

**3.1 Zona Izquierda --- Galería de Imágenes**

+-----------------------------------------------------------------------+
| **Estado inicial al cargar la página**                                |
|                                                                       |
| → Mostrar la imagen principal (is_primary=true) en el visor grande.   |
|                                                                       |
| → Mostrar TODAS las imágenes de product_images como thumbnails        |
| clicables abajo/al lado.                                              |
|                                                                       |
| → El thumbnail de la imagen principal aparece resaltado/seleccionado. |
|                                                                       |
| → Las imágenes están ordenadas por sort_order (0, 1, 2\...).          |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Cuando el usuario hace clic en un thumbnail**                       |
|                                                                       |
| → La imagen clicada se muestra en el visor grande.                    |
|                                                                       |
| → El thumbnail clicado se resalta.                                    |
|                                                                       |
| → Animación suave de crossfade entre imágenes (no un salto brusco).   |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Cuando el usuario selecciona una variante (género + talla)**        |
|                                                                       |
| → Verificar si esa variante tiene variant_images.                     |
|                                                                       |
| → SI tiene: reemplazar los thumbnails con las imágenes de la          |
| variante.                                                             |
|                                                                       |
| El visor grande muestra la imagen primaria de la variante.            |
|                                                                       |
| → SI NO tiene: mantener las product_images originales sin cambiar     |
| nada.                                                                 |
|                                                                       |
| → Esta lógica es exactamente como funciona Nike, Adidas, Zara, etc.   |
+-----------------------------------------------------------------------+

  ----------------- ------------------------------ ---------------------------
  **Dispositivo**   **Layout de la galería**       **Interacción**

  Mobile            Scroll horizontal tipo         Swipe entre imágenes + dots
                    carrusel, imagen ocupa 100%    indicadores
                    del ancho                      

  Tablet            Imagen grande + fila de        Tap en thumbnail para
                    thumbnails debajo              cambiar

  Desktop           Imagen grande a la izquierda + Click + hover zoom en
                    columna de thumbnails a su     imagen grande
                    lado                           
  ----------------- ------------------------------ ---------------------------

**3.2 Zona Derecha --- Selector de Variante**

Esta zona es el corazón de la página de producto. El flujo tiene un
orden específico:

+---+------------------------------------------------------------------+
| * | **Selector de Género**                                           |
| * |                                                                  |
| 1 | Mostrar botones: \"Hombre\" \| \"Mujer\" (o los géneros          |
| * | disponibles para ese producto).                                  |
| * |                                                                  |
|   | Solo mostrar géneros que tienen al menos una variante activa con |
|   | stock \> 0.                                                      |
|   |                                                                  |
|   | Estado inicial: ninguno seleccionado (o pre-seleccionar          |
|   | \"Unisex\" si aplica).                                           |
|   |                                                                  |
|   | Al seleccionar género: actualizar las tallas disponibles del     |
|   | siguiente paso.                                                  |
+---+------------------------------------------------------------------+

+---+------------------------------------------------------------------+
| * | **Selector de Talla**                                            |
| * |                                                                  |
| 2 | Mostrar todas las tallas: XS / S / M / L / XL / XXL / XXXL.      |
| * |                                                                  |
| * | Las tallas disponibles (con stock) para el género elegido se     |
|   | muestran ACTIVAS.                                                |
|   |                                                                  |
|   | Las tallas sin stock para ese género se muestran en gris,        |
|   | tachadas y no clicables.                                         |
|   |                                                                  |
|   | Las tallas que no existen para ese producto no se muestran.      |
|   |                                                                  |
|   | Si aún no se eligió género, todas las tallas están               |
|   | deshabilitadas con mensaje: \"Elige género primero\".            |
|   |                                                                  |
|   | Al seleccionar una talla + género: queda determinada la variante |
|   | exacta.                                                          |
+---+------------------------------------------------------------------+

+---+------------------------------------------------------------------+
| * | **Información dinámica según variante**                          |
| * |                                                                  |
| 3 | Precio: mostrar price_override de la variante si existe, sino    |
| * | base_price del producto.                                         |
| * |                                                                  |
|   | Stock: \"Últimas X unidades\" si stock \<= 5. \"Disponible\" si  |
|   | stock \> 5. \"Agotado\" si stock = 0.                            |
|   |                                                                  |
|   | SKU: mostrar si existe (útil para soporte al cliente).           |
|   |                                                                  |
|   | Imagen: cambiar galería a las imágenes de esa variante (ver      |
|   | sección 3.1).                                                    |
+---+------------------------------------------------------------------+

+---+------------------------------------------------------------------+
| * | **Botón Agregar al Carrito**                                     |
| * |                                                                  |
| 4 | DESHABILITADO si: no se eligió género, no se eligió talla, o     |
| * | stock = 0.                                                       |
| * |                                                                  |
|   | ACTIVO si: hay variante seleccionada con stock \> 0.             |
|   |                                                                  |
|   | Al hacer clic: agregar al carrito la variante + cantidad         |
|   | elegida, mostrar feedback visual.                                |
|   |                                                                  |
|   | El carrito guarda: variant_id, product_name, gender, size,       |
|   | unit_price, image_url, quantity.                                 |
+---+------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **Estado y lógica de la página de producto**                          |
|                                                                       |
| // FLUJO DE ESTADO en la página de producto                           |
|                                                                       |
| selectedGender = null // \"hombre\" \| \"mujer\" \| \"unisex\"        |
|                                                                       |
| selectedSize = null // \"S\" \| \"M\" \| \"L\" \....                  |
|                                                                       |
| // Variante activa = cruce de género + talla                          |
|                                                                       |
| selectedVariant = variants.find(                                      |
|                                                                       |
| v =\> v.gender === selectedGender && v.size === selectedSize          |
|                                                                       |
| )                                                                     |
|                                                                       |
| // Tallas disponibles para el género elegido                          |
|                                                                       |
| availableSizes = variants                                             |
|                                                                       |
| .filter(v =\> v.gender === selectedGender && v.is_active)             |
|                                                                       |
| .map(v =\> ({ size: v.size, inStock: v.stock \> 0 }))                 |
|                                                                       |
| // Precio a mostrar                                                   |
|                                                                       |
| displayPrice = selectedVariant?.price_override ?? product.base_price  |
|                                                                       |
| // Imágenes a mostrar en galería                                      |
|                                                                       |
| galleryImages =                                                       |
|                                                                       |
| selectedVariant?.variant_images?.length \> 0                          |
|                                                                       |
| ? selectedVariant.variant_images // imágenes de la variante           |
|                                                                       |
| : product.product_images // imágenes generales                        |
+-----------------------------------------------------------------------+

**4. Carrito --- Cómo Funciona**

El carrito es un estado global del cliente (no se guarda en la BD hasta
hacer checkout). Persiste si el usuario cierra y vuelve a abrir el
navegador.

**4.1 Qué guarda cada ítem del carrito**

  ---------------- -------------------------- ---------------------------
  **Campo**        **Por qué es necesario**   **De dónde viene**

  variant_id       Identificador único de lo  product_variants.id
                   que se compra              

  product_name     Para mostrarlo en el       products.name
                   carrito                    

  gender           Para mostrar \"Talla M /   product_variants.gender
                   Hombre\"                   

  size             Para mostrar \"Talla M /   product_variants.size
                   Hombre\"                   

  unit_price       Precio al momento de       price_override ??
                   agregar (no cambia)        base_price

  image_url        Miniatura en el carrito    variant_images\[0\] ??
                                              product_images\[0\]

  quantity         Cantidad                   Input del usuario (min 1)
  ---------------- -------------------------- ---------------------------

**4.2 Reglas del Carrito**

-   Si el usuario agrega la misma variante dos veces, sumar la cantidad
    (no duplicar el ítem).

-   La imagen que se guarda en el carrito es la de la variante, no la
    general del producto.

-   El precio que se guarda es el del momento en que se agrega. Si el
    producto cambia de precio, el carrito no cambia.

-   El carrito NO valida stock en tiempo real. La validación de stock
    ocurre al hacer checkout.

-   El carrito debe ser visible desde cualquier página (ícono en navbar
    con contador de ítems).

-   En mobile: el carrito es un drawer que sale desde la derecha. En
    desktop: mismo comportamiento o puede ser una página.

**4.3 Drawer del Carrito (mobile-first)**

+-----------------------------------------------------------------------+
| **Estructura visual del CartDrawer**                                  |
|                                                                       |
| Header: \"Tu carrito (3 productos)\" + botón cerrar X                 |
|                                                                       |
| Lista de ítems: imagen \| nombre + género + talla \| precio \|        |
| botones - cantidad +                                                  |
|                                                                       |
| Footer fijo: subtotal + botón \"Ir al checkout\" (siempre visible     |
| aunque se haga scroll)                                                |
|                                                                       |
| Si está vacío: ilustración + mensaje + botón \"Ver productos\"        |
+-----------------------------------------------------------------------+

**5. Navbar y Layout --- Comportamiento Mobile-First**

Toda la interfaz debe estar diseñada primero para pantallas de 390px
(iPhone) y luego adaptarse a desktop. Tailwind ya es mobile-first por
diseño.

**5.1 Navbar**

  ------------------ ------------------------ ----------------------------
  **Elemento**       **Mobile (\< 768px)**    **Desktop (\>= 1024px)**

  Logo               Centrado o izquierda,    Izquierda, más grande
                     compacto                 

  Links de           Ocultos. Se muestran con Visibles en línea horizontal
  navegación         menú hamburguesa         

  Ícono carrito      Siempre visible con      Siempre visible con contador
                     contador                 

  Botón              Ícono solo               Ícono + texto \"Entrar\" o
  login/usuario                               avatar

  Menú hamburguesa   Visible                  Oculto

  Buscador           Ícono que expande al     Campo siempre visible o
                     tocar                    ícono
  ------------------ ------------------------ ----------------------------

**5.2 Grid del Catálogo**

+-----------------------------------------------------------------------+
| **Grid responsivo del catálogo**                                      |
|                                                                       |
| // Tailwind --- mobile-first grid                                     |
|                                                                       |
| // Mobile: 1 columna (pantallas pequeñas)                             |
|                                                                       |
| // Tablet: 2 columnas (sm: 640px+)                                    |
|                                                                       |
| // Desktop: 3 columnas (lg: 1024px+)                                  |
|                                                                       |
| className=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 px-4 |
| lg:px-8\"                                                             |
+-----------------------------------------------------------------------+

**5.3 Reglas generales de comportamiento**

-   Todos los botones de acción principal (Agregar al carrito, Comprar
    ahora) deben tener w-full en mobile.

-   Los modales y drawers en mobile deben ocupar pantalla completa o
    casi completa.

-   Las imágenes deben usar loading=\"lazy\" para no bloquear la carga
    inicial.

-   El scroll de la página de producto en mobile: primero aparece la
    galería, luego el selector de variante.

-   En desktop: galería y selector aparecen lado a lado (grid de 2
    columnas).

-   Los textos de precios deben ser grandes y legibles en mobile (mínimo
    20px).

**6. Flujo Completo del Usuario (Happy Path)**

Este es el recorrido que debe funcionar perfectamente de punta a punta:

+---+------------------------------------------------------------------+
| * | **Llega al Home**                                                |
| * |                                                                  |
| 1 | Ve el hero con imagen de campaña.                                |
| * |                                                                  |
| * | Ve la sección \"Colección Oficial\" con las tarjetas de          |
|   | producto.                                                        |
|   |                                                                  |
|   | Cada tarjeta muestra: imagen principal correcta, nombre, precio. |
+---+------------------------------------------------------------------+

+---+------------------------------------------------------------------+
| * | **Entra al detalle de un producto**                              |
| * |                                                                  |
| 2 | URL: /producto/camiseta-local-2026                               |
| * |                                                                  |
| * | Se carga la galería con todas las imágenes del producto.         |
|   |                                                                  |
|   | Ve el nombre, descripción, precio base.                          |
|   |                                                                  |
|   | El selector de variante está en estado inicial (nada             |
|   | seleccionado).                                                   |
|   |                                                                  |
|   | El botón \"Agregar al carrito\" está deshabilitado.              |
+---+------------------------------------------------------------------+

+---+------------------------------------------------------------------+
| * | **Selecciona género y talla**                                    |
| * |                                                                  |
| 3 | Hace clic en \"Hombre\".                                         |
| * |                                                                  |
| * | Las tallas disponibles para hombre se activan.                   |
|   |                                                                  |
|   | Hace clic en \"L\".                                              |
|   |                                                                  |
|   | La variante Hombre/L queda seleccionada.                         |
|   |                                                                  |
|   | La galería cambia a las imágenes de esa variante (si las tiene). |
|   |                                                                  |
|   | El precio se actualiza si la variante tiene price_override.      |
|   |                                                                  |
|   | El botón \"Agregar al carrito\" se activa.                       |
+---+------------------------------------------------------------------+

+---+------------------------------------------------------------------+
| * | **Agrega al carrito**                                            |
| * |                                                                  |
| 4 | Clic en \"Agregar al carrito\".                                  |
| * |                                                                  |
| * | Se abre el CartDrawer mostrando el ítem con: imagen de la        |
|   | variante, nombre, talla, género, precio, cantidad 1.             |
|   |                                                                  |
|   | El ícono del carrito en el navbar muestra \"1\".                 |
+---+------------------------------------------------------------------+

+---+------------------------------------------------------------------+
| * | **Hace checkout**                                                |
| * |                                                                  |
| 5 | Clic en \"Ir al checkout\" en el CartDrawer.                     |
| * |                                                                  |
| * | Si no está logueado: redirigir a login/registro, luego volver al |
|   | checkout.                                                        |
|   |                                                                  |
|   | Si está logueado: mostrar formulario de datos de envío.          |
|   |                                                                  |
|   | Clic en \"Pagar con Wompi\": se crea la orden en Supabase y se   |
|   | redirige a Wompi.                                                |
+---+------------------------------------------------------------------+

+---+------------------------------------------------------------------+
| * | **Retorno post-pago**                                            |
| * |                                                                  |
| 6 | Wompi redirige de vuelta a la tienda.                            |
| * |                                                                  |
| * | Mostrar página de confirmación con número de orden.              |
|   |                                                                  |
|   | El carrito se vacía automáticamente.                             |
|   |                                                                  |
|   | El webhook de Wompi actualiza el estado de la orden en Supabase  |
|   | en segundo plano.                                                |
+---+------------------------------------------------------------------+

**7. Prompt Base para el Modelo de IA**

Usa este texto como contexto inicial cada vez que le pidas al modelo que
trabaje en el frontend:

+-----------------------------------------------------------------------+
| **📋 PROMPT BASE --- copiar y pegar al inicio de cada sesión**        |
|                                                                       |
| Estoy construyendo una tienda e-commerce en Next.js 14 (App Router)   |
| con Supabase,                                                         |
|                                                                       |
| Tailwind CSS (mobile-first) y Wompi como pasarela de pago.            |
|                                                                       |
| **Reglas de imágenes:**                                               |
|                                                                       |
| \- Las imágenes NO son un campo URL en products. Son filas en         |
| product_images.                                                       |
|                                                                       |
| \- La imagen principal tiene is_primary=true. Si no hay ninguna, usar |
| la primera.                                                           |
|                                                                       |
| \- Cada variante (gender+size) tiene su propia tabla variant_images.  |
|                                                                       |
| \- Al seleccionar una variante, la galería cambia a variant_images    |
| (si existen).                                                         |
|                                                                       |
| \- La URL se construye con:                                           |
| supabase.storage.from(\"product-media\").getPublicUrl(key)            |
|                                                                       |
| **Reglas de variantes:**                                              |
|                                                                       |
| \- Primero se elige género (hombre/mujer), luego se filtra tallas por |
| ese género.                                                           |
|                                                                       |
| \- Tallas sin stock se muestran deshabilitadas, no se ocultan.        |
|                                                                       |
| \- El botón \"Agregar\" solo se activa cuando hay género + talla +    |
| stock \> 0.                                                           |
|                                                                       |
| **Reglas mobile-first:**                                              |
|                                                                       |
| \- Diseña primero para 390px. Luego sm: md: lg: para pantallas más    |
| grandes.                                                              |
|                                                                       |
| \- Galería en mobile = carrusel horizontal con swipe. En desktop =    |
| thumbnails + visor.                                                   |
|                                                                       |
| \- Carrito = drawer lateral. Botones CTA = w-full en mobile.          |
+-----------------------------------------------------------------------+

+-----------------------------------------------------------------------+
| **CAFETEROS SHOP · Guía de Frontend v1.0**                            |
|                                                                       |
| Documento de contexto para modelo de IA                               |
+-----------------------------------------------------------------------+
