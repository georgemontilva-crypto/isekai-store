// Contenido de cada zona del mapa del Isekai World Fest.
// id = data-zone del SVG · img = archivo en /public/fest/renders (null = sin render todavía)
export type FestZone = {
  id: string;
  paso: string;
  nombre: string;
  img: string | null;
  resumen: string;
  marca: string[];
};

export const FEST_ZONES: FestZone[] = [
  {
    id: "red-carpet", paso: "Antes de entrar", nombre: "Red Carpet", img: "red-carpet",
    resumen: "La alfombra roja se monta afuera, antes del Portal. En la apertura la recorren los invitados, los cosplayers y la prensa; después queda como set de fotografía para todos los asistentes.",
    marca: [
      "Backdrop de prensa con tu logo en cada foto y entrevista de la apertura.",
      "Cobertura de medios y creadores desde el primer minuto del evento.",
      "Set de fotos abierto los dos días: tu marca en las fotos que la gente publica."
    ]
  },
  {
    id: "portal", paso: "Paso 1 · 2", nombre: "Portal y Corredor del Despertar", img: "portal",
    resumen: "La entrada al Fest es un portal. Al cruzarlo, un corredor cerrado con murales, pantallas y humo lleva a la activación de boletos: el asistente entra a otro mundo.",
    marca: [
      "El 100% de los asistentes pasa por aquí: es la exposición más alta del evento.",
      "Pantallas del corredor con contenido de tu marca integrado a la historia.",
      "Naming del portal o del corredor durante los dos días."
    ]
  },
  {
    id: "activacion", paso: "Paso 3 · 4", nombre: "Activación de boletos y Mercado del Lobby", img: "activacion",
    resumen: "Ocho puestos activan el boleto y el Level Pass de cada asistente, así la entrada fluye sin colas largas. Alrededor, el Mercado del Lobby con tiendas, el Photo Spot y el Merch oficial del Fest.",
    marca: [
      "Branding de los 8 puestos de activación, que ve cada persona que entra.",
      "Obsequio o muestra de bienvenida entregada junto con la activación.",
      "Photo Spot patrocinado en la primera parada del recorrido."
    ]
  },
  {
    id: "frost", paso: "Paso 5", nombre: "Frost Zone", img: "frost",
    resumen: "Una zona tematizada de hielo con una figura a escala real, escenografía nevada y una misión del Level Pass.",
    marca: [
      "Encaja con bebidas frías, refrescos o helados: sampling dentro de la experiencia.",
      "Naming: «Frost Zone presentada por» tu marca.",
      "Misión del Level Pass vinculada a tu producto."
    ]
  },
  {
    id: "shadow", paso: "Paso 6", nombre: "Shadow Zone", img: "shadow",
    resumen: "Beru a tamaño real, de 2 metros, rodeado de dummies y escenografía inmersiva. Es la antesala de los Dungeons y la foto que todos van a querer.",
    marca: [
      "La foto más compartida del evento, con tu marca integrada en la escena.",
      "Contenido orgánico en redes durante y después del Fest.",
      "Zona contigua a los Dungeons: el público pasa de una a otra."
    ]
  },
  {
    id: "dungeons", paso: "Paso 7", nombre: "Dungeons", img: "dungeons",
    resumen: "Tres pruebas que dan experiencia en el Level Pass: Fuerza, Destreza Mental y Destreza Física. Es un salón cerrado que la marca patrocinadora puede vestir por completo.",
    marca: [
      "Patrocinio total del salón o de una prueba por marca.",
      "Ranking en pantalla con tu logo, visible toda la jornada.",
      "Tu producto dentro del reto: bebida energética en Fuerza, tecnología en Mental, deportiva en Física."
    ]
  },
  {
    id: "gamer", paso: "Paso 8", nombre: "Zona Gamer · Arena Panter", img: "gamer",
    resumen: "Torneos oficiales, free play, zonas pro y premios, operados con Arena Panter. Está en un salón cerrado, junto al corredor de tiendas.",
    marca: [
      "Ideal para telecomunicaciones, periféricos, bebidas energéticas y tecnología.",
      "Premios de torneo con tu marca y menciones en cada partida.",
      "Presencia en la pantalla principal de la zona y en las transmisiones."
    ]
  },
  {
    id: "mercado-sur", paso: "Paso 9", nombre: "Mercado Sur · Tiendas", img: "mercado-sur",
    resumen: "El corredor comercial principal, con stands Mercader tematizados. Comprar en un stand habilitado también otorga experiencia en el Level Pass.",
    marca: [
      "Tráfico constante: es el paso hacia el escenario.",
      "Señalética y activaciones a lo largo del pasillo.",
      "Stands disponibles en las modalidades Mercader, Gremio y Gran Gremio."
    ]
  },
  {
    id: "escenario", paso: "Paso 10", nombre: "Escenario principal y Zona VIP", img: "escenario",
    resumen: "La tarima del Fest: apertura, obra teatral, shows y concursos de cosplay. La Zona VIP queda a un lado, de frente a la tarima, con acceso directo desde el backstage.",
    marca: [
      "El momento de mayor audiencia del evento, con tu logo en pantallas.",
      "Menciones del presentador entre shows y concursos.",
      "Palco VIP con tu marca: experiencia premium para invitados y clientes."
    ]
  },
  {
    id: "stream", paso: "Paso 10", nombre: "Stream Zone", img: "stream",
    resumen: "Un set acordonado con acceso exclusivo para un streamer, que transmite el Fest en vivo junto al escenario.",
    marca: [
      "Tu logo en el set y en el overlay de la transmisión.",
      "Alcance fuera del recinto: llega a quienes no pudieron asistir.",
      "Segmentos patrocinados durante el directo."
    ]
  },
  {
    id: "gran-salon", paso: "Paso 11", nombre: "Gran Salón · Gremio y Gran Gremio", img: null,
    resumen: "El corazón comercial del Fest: 15 stands Gremio y Gran Gremio, que son puntos oficiales de venta de boletería, rodean el área de público frente al escenario. Los stands Mercader ocupan el borde.",
    marca: [
      "La ubicación con más tráfico del evento.",
      "Punto oficial de venta de boletería con comisión por boleto.",
      "Misiones del Level Pass que llevan público directo a tu stand."
    ]
  },
  {
    id: "meet-greet", paso: "Paso 12", nombre: "Meet & Greet · Invitados internacionales", img: null,
    resumen: "Los stands de los dos invitados internacionales, cada uno con su backdrop y fila acordonada, junto al backstage.",
    marca: [
      "Las filas dan minutos de exposición frente a tu marca.",
      "Backdrop de firmas y fotos con tu logo.",
      "Contenido con los invitados para tus redes."
    ]
  },
  {
    id: "artist-alley", paso: "Paso 12", nombre: "Artist Alley", img: null,
    resumen: "Todos los artistas regionales en una sola zona, con backdrop de fondo. De aquí sale el cómic del Fest hecho por artistas de la región.",
    marca: [
      "Apoyo visible al talento local.",
      "Tu marca puede aparecer en escenas del cómic del Fest.",
      "Branding del backdrop del Artist Alley."
    ]
  },
  {
    id: "monarch", paso: "Paso 13", nombre: "Room of the Monarch", img: "monarch",
    resumen: "El cuarto del Monarca: un trono con figuras a tamaño real y la zona fotográfica oficial. Es la última gran experiencia del recorrido.",
    marca: [
      "La foto de cierre del recorrido, con tu marca en la escena.",
      "Experiencia premium para asociar tu marca con exclusividad.",
      "Misión del Level Pass en una de las paradas más buscadas."
    ]
  },
  {
    id: "comidas", paso: "Paso 14", nombre: "Zona de comidas", img: "comidas",
    resumen: "La zona de descanso con puestos de comida y mesas, ubicada al final del recorrido y junto a la salida.",
    marca: [
      "Proveedor exclusivo de alimentos o bebidas del Fest.",
      "Mesas, puestos y pantallas con tu marca.",
      "Público que se detiene: el mejor lugar para promociones y sampling."
    ]
  }
];

export const FEST_CONTACTO = "patrocinio@isekaiworld.co";

