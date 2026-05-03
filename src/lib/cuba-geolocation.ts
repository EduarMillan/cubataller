/**
 * Centroides aproximados para los 168 municipios cubanos + Isla de la Juventud.
 * Precisión a nivel de municipio (~2-10 km). Suficiente para estimar distancias
 * entre la posición del usuario y una tienda/servicio.
 */

type Coord = [number, number];

const MUNICIPIO_COORDS: Record<string, Coord> = {
  // Pinar del Río
  "consolacion del sur": [22.5006, -83.5108],
  "guane": [22.205, -84.0875],
  "la palma": [22.7556, -83.5547],
  "los palacios": [22.5847, -83.2444],
  "mantua": [22.29, -84.2842],
  "minas de matahambre": [22.59, -83.95],
  "pinar del rio": [22.4174, -83.6981],
  "san juan y martinez": [22.2675, -83.8272],
  "sandino": [22.0667, -84.0583],
  "vinales": [22.6189, -83.7081],

  // Artemisa
  "alquizar": [22.7878, -82.5847],
  "artemisa": [22.8133, -82.7592],
  "bahia honda": [22.9039, -83.1633],
  "bauta": [22.9842, -82.5475],
  "caimito": [22.9914, -82.4894],
  "candelaria": [22.7397, -82.965],
  "guanajay": [22.9269, -82.6856],
  "guira de melena": [22.7894, -82.5106],
  "mariel": [22.9889, -82.7547],
  "san antonio de los banos": [22.8867, -82.4969],
  "san cristobal": [22.7197, -83.0492],

  // La Habana
  "arroyo naranjo": [23.0286, -82.3514],
  "boyeros": [23.0022, -82.4047],
  "centro habana": [23.1369, -82.3658],
  "cerro": [23.1186, -82.3817],
  "cotorro": [23.0197, -82.2758],
  "diez de octubre": [23.1031, -82.3656],
  "guanabacoa": [23.1306, -82.3008],
  "habana del este": [23.1683, -82.3042],
  "habana vieja": [23.1397, -82.3531],
  "la lisa": [23.0744, -82.4717],
  "marianao": [23.0833, -82.4333],
  "plaza de la revolucion": [23.1306, -82.3856],
  "playa": [23.1136, -82.4564],
  "regla": [23.1339, -82.3344],
  "san miguel del padron": [23.0844, -82.3033],

  // Mayabeque
  "batabano": [22.7186, -82.2886],
  "bejucal": [22.9258, -82.385],
  "guines": [22.8358, -82.025],
  "jaruco": [23.0128, -82.0044],
  "madruga": [22.9114, -81.8597],
  "melena del sur": [22.7869, -82.1531],
  "nueva paz": [22.7619, -81.7497],
  "quivican": [22.8203, -82.3597],
  "san jose de las lajas": [22.9617, -82.1517],
  "san nicolas": [22.7708, -81.9192],
  "santa cruz del norte": [23.1572, -81.9275],

  // Matanzas
  "calimete": [22.5142, -80.9092],
  "cardenas": [23.0411, -81.2058],
  "cienaga de zapata": [22.35, -81.1175],
  "colon": [22.7203, -80.9072],
  "jaguey grande": [22.5278, -81.1297],
  "jovellanos": [22.8053, -81.1956],
  "limonar": [22.9572, -81.4144],
  "los arabos": [22.74, -80.7333],
  "marti": [22.9533, -80.9244],
  "matanzas": [23.0411, -81.5775],
  "pedro betancourt": [22.7208, -81.2917],
  "perico": [22.7747, -81.0228],
  "union de reyes": [22.7942, -81.5306],

  // Villa Clara
  "caibarien": [22.5189, -79.4675],
  "camajuani": [22.4731, -79.7592],
  "cifuentes": [22.6478, -80.0322],
  "corralillo": [23.0103, -80.5797],
  "encrucijada": [22.6206, -79.8636],
  "manicaragua": [22.1525, -79.9794],
  "placetas": [22.3169, -79.6536],
  "quemado de guines": [22.7847, -80.2589],
  "ranchuelo": [22.5867, -80.1486],
  "remedios": [22.4942, -79.545],
  "sagua la grande": [22.8089, -80.0742],
  "santa clara": [22.4069, -79.9647],
  "santo domingo": [22.5867, -80.2453],

  // Cienfuegos
  "abreus": [22.2861, -80.5611],
  "aguada de pasajeros": [22.3839, -80.8439],
  "cienfuegos": [22.1453, -80.4364],
  "cruces": [22.3411, -80.2742],
  "cumanayagua": [22.1467, -80.2061],
  "lajas": [22.4169, -80.29],
  "palmira": [22.2447, -80.3925],
  "rodas": [22.3328, -80.5658],

  // Sancti Spíritus
  "cabaiguan": [22.0792, -79.4967],
  "fomento": [22.1056, -79.7106],
  "jatibonico": [21.9444, -79.1689],
  "la sierpe": [21.7681, -79.0922],
  "sancti spiritus": [21.9292, -79.4422],
  "taguasco": [22.0444, -79.2911],
  "trinidad": [21.8025, -79.9836],
  "yaguajay": [22.3306, -79.2378],

  // Ciego de Ávila
  "baragua": [21.6322, -78.4928],
  "bolivia": [22.0125, -78.3242],
  "chambas": [22.1933, -78.8856],
  "ciego de avila": [21.8403, -78.7619],
  "ciro redondo": [21.9897, -78.7858],
  "florencia": [22.1383, -78.9792],
  "majagua": [21.9442, -78.9842],
  "moron": [22.1086, -78.6258],
  "primero de enero": [22.0722, -78.5519],
  "venezuela": [21.7383, -78.7975],

  // Camagüey
  "camaguey": [21.3808, -77.9169],
  "carlos manuel de cespedes": [21.4711, -78.2461],
  "esmeralda": [21.8503, -78.1206],
  "florida": [21.5275, -78.225],
  "guaimaro": [21.0586, -77.3489],
  "jimaguayu": [21.2533, -77.9111],
  "minas": [21.4894, -77.6217],
  "najasa": [21.075, -77.6492],
  "nuevitas": [21.5475, -77.2647],
  "santa cruz del sur": [20.7233, -77.9967],
  "sibanicu": [21.2444, -77.5394],
  "sierra de cubitas": [21.6, -77.7],
  "vertientes": [21.2522, -78.1531],

  // Las Tunas
  "amancio": [20.7503, -77.0919],
  "colombia": [20.97, -77.1356],
  "jesus menendez": [21.1858, -76.4794],
  "jobabo": [20.93, -77.2825],
  "las tunas": [20.9603, -76.9514],
  "majibacoa": [20.9842, -76.6886],
  "manati": [21.3378, -76.9389],
  "puerto padre": [21.1953, -76.6022],

  // Granma
  "bartolome maso": [20.1803, -76.9292],
  "bayamo": [20.3794, -76.6431],
  "buey arriba": [20.2417, -76.8917],
  "campechuela": [20.2261, -77.2667],
  "cauto cristo": [20.6633, -76.6556],
  "guisa": [20.2553, -76.5347],
  "jiguani": [20.3628, -76.4356],
  "manzanillo": [20.3433, -77.1192],
  "media luna": [20.15, -77.4361],
  "niquero": [20.0461, -77.5681],
  "pilon": [19.905, -77.3197],
  "rio cauto": [20.5778, -76.8511],
  "yara": [20.2733, -76.9536],

  // Holguín
  "antilla": [20.8331, -75.7378],
  "baguanos": [20.7647, -76.0306],
  "banes": [20.9619, -75.7203],
  "cacocum": [20.7367, -76.3],
  "calixto garcia": [20.8617, -76.3911],
  "cueto": [20.6519, -75.9472],
  "frank pais": [20.8083, -75.6336],
  "gibara": [21.1097, -76.1339],
  "holguin": [20.8872, -76.2631],
  "mayari": [20.6644, -75.6797],
  "moa": [20.6586, -74.9472],
  "rafael freyre": [21.0431, -75.9853],
  "sagua de tanamo": [20.5814, -75.2378],
  "urbano noris": [20.6783, -76.1531],

  // Santiago de Cuba
  "contramaestre": [20.3033, -76.2492],
  "guama": [19.9889, -76.7711],
  "mella": [20.1078, -75.8514],
  "palma soriano": [20.2156, -76.0008],
  "santiago de cuba": [20.0247, -75.8219],
  "segundo frente": [20.4467, -75.6042],
  "songo-la maya": [20.1736, -75.6592],
  "tercer frente": [20.0631, -76.1011],

  // Guantánamo
  "baracoa": [20.3447, -74.4967],
  "caimanera": [19.9758, -75.1289],
  "el salvador": [20.215, -75.0556],
  "guantanamo": [20.145, -75.2089],
  "imias": [20.07, -74.6306],
  "maisi": [20.2575, -74.1611],
  "manuel tames": [20.2114, -75.1283],
  "niceto perez": [20.1453, -75.3697],
  "san antonio del sur": [20.0581, -74.7981],
  "yateras": [20.3144, -74.9244],

  // Isla de la Juventud
  "isla de la juventud": [21.73, -82.7833],
};

/**
 * Municipios con nombre repetido entre provincias.
 * La clave es `${normalized(municipio)}|${provinciaCode}`.
 */
const MUNICIPIO_COORDS_BY_PROVINCIA: Record<string, Coord> = {
  "san luis|PR": [22.2922, -83.7561],
  "san luis|SC": [20.1947, -75.8514],
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getCoordsForMunicipio(
  municipio: string | null | undefined,
  provinciaCode?: string | null,
): { lat: number; lng: number } | null {
  if (!municipio) return null;
  const key = normalize(municipio);

  if (provinciaCode) {
    const compound = MUNICIPIO_COORDS_BY_PROVINCIA[`${key}|${provinciaCode}`];
    if (compound) return { lat: compound[0], lng: compound[1] };
  }

  const coords = MUNICIPIO_COORDS[key];
  return coords ? { lat: coords[0], lng: coords[1] } : null;
}

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function formatDistanceKm(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
