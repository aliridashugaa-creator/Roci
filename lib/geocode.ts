// Geocoding + OSRM routing helpers for the Transport map
// In-memory caches survive re-renders within the same browser session

const geocodeCache = new Map<string, [number, number] | null>();
const routeCache = new Map<string, [number, number][]>();

/** Major UK cities → [lat, lon] */
const UK_CITIES: Record<string, [number, number]> = {
  "london": [51.5074, -0.1278],
  "city of london": [51.5155, -0.0922],
  "east london": [51.5280, -0.0460],
  "west london": [51.4965, -0.2585],
  "north london": [51.5546, -0.1037],
  "south london": [51.4573, -0.1183],
  "manchester": [53.4808, -2.2426],
  "birmingham": [52.4862, -1.8904],
  "leeds": [53.8008, -1.5491],
  "glasgow": [55.8642, -4.2518],
  "edinburgh": [55.9533, -3.1883],
  "liverpool": [53.4084, -2.9916],
  "bristol": [51.4545, -2.5879],
  "sheffield": [53.3811, -1.4701],
  "cardiff": [51.4816, -3.1791],
  "newcastle": [54.9783, -1.6174],
  "newcastle upon tyne": [54.9783, -1.6174],
  "nottingham": [52.9548, -1.1581],
  "leicester": [52.6369, -1.1398],
  "southampton": [50.9097, -1.4044],
  "portsmouth": [50.8198, -1.0880],
  "brighton": [50.8225, -0.1372],
  "oxford": [51.7520, -1.2577],
  "cambridge": [52.2053, 0.1218],
  "norwich": [52.6309, 1.2974],
  "derby": [52.9225, -1.4746],
  "coventry": [52.4068, -1.5197],
  "belfast": [54.5973, -5.9301],
  "aberdeen": [57.1497, -2.0943],
  "dundee": [56.4620, -2.9707],
  "inverness": [57.4778, -4.2247],
  "plymouth": [50.3755, -4.1427],
  "exeter": [50.7236, -3.5275],
  "swansea": [51.6214, -3.9436],
  "hull": [53.7676, -0.3274],
  "kingston upon hull": [53.7676, -0.3274],
  "stoke-on-trent": [53.0027, -2.1794],
  "stoke on trent": [53.0027, -2.1794],
  "stoke": [53.0027, -2.1794],
  "wolverhampton": [52.5862, -2.1279],
  "middlesbrough": [54.5742, -1.2349],
  "sunderland": [54.9061, -1.3815],
  "york": [53.9590, -1.0815],
  "peterborough": [52.5695, -0.2405],
  "reading": [51.4543, -0.9781],
  "luton": [51.8787, -0.4200],
  "milton keynes": [52.0406, -0.7594],
  "northampton": [52.2405, -0.9027],
  "ipswich": [52.0567, 1.1482],
  "gloucester": [51.8642, -2.2382],
  "cheltenham": [51.8994, -2.0783],
  "worcester": [52.1920, -2.2200],
  "shrewsbury": [52.7071, -2.7540],
  "chester": [53.1905, -2.8916],
  "blackpool": [53.8142, -3.0503],
  "bolton": [53.5781, -2.4282],
  "salford": [53.4875, -2.2901],
  "bradford": [53.7960, -1.7594],
  "wakefield": [53.6830, -1.4990],
  "huddersfield": [53.6458, -1.7850],
  "warrington": [53.3900, -2.5970],
  "wigan": [53.5452, -2.6306],
  "stockport": [53.4083, -2.1494],
  "doncaster": [53.5228, -1.1286],
  "rotherham": [53.4326, -1.3635],
  "barnsley": [53.5526, -1.4797],
  "grimsby": [53.5675, -0.0798],
  "lincoln": [53.2307, -0.5406],
  "grantham": [52.9142, -0.6457],
  "newark": [53.0762, -0.8130],
  "loughborough": [52.7722, -1.2046],
  "burton upon trent": [52.8019, -1.6367],
  "tamworth": [52.6341, -1.6956],
  "telford": [52.6788, -2.4451],
  "hereford": [52.0565, -2.7160],
  "bath": [51.3811, -2.3590],
  "swindon": [51.5558, -1.7797],
  "bournemouth": [50.7192, -1.8808],
  "poole": [50.7143, -1.9870],
  "salisbury": [51.0693, -1.7942],
  "guildford": [51.2362, -0.5704],
  "woking": [51.3168, -0.5600],
  "crawley": [51.1093, -0.1872],
  "eastbourne": [50.7688, 0.2840],
  "hastings": [50.8543, 0.5731],
  "folkestone": [51.0816, 1.1693],
  "dover": [51.1295, 1.3089],
  "maidstone": [51.2720, 0.5290],
  "tunbridge wells": [51.1320, 0.2630],
  "royal tunbridge wells": [51.1320, 0.2630],
  "colchester": [51.8960, 0.8919],
  "chelmsford": [51.7356, 0.4685],
  "southend-on-sea": [51.5459, 0.7077],
  "basildon": [51.5760, 0.4882],
  "harlow": [51.7758, 0.1040],
  "stevenage": [51.9025, -0.2007],
  "watford": [51.6565, -0.3959],
  "st albans": [51.7454, -0.3367],
  "hemel hempstead": [51.7526, -0.4692],
  "aylesbury": [51.8168, -0.8124],
  "slough": [51.5105, -0.5950],
  "windsor": [51.4836, -0.6044],
  "maidenhead": [51.5227, -0.7177],
  "wokingham": [51.4114, -0.8352],
  "basingstoke": [51.2665, -1.0874],
  "winchester": [51.0632, -1.3081],
  "newport": [51.5879, -2.9977],
  "newport (wales)": [51.5879, -2.9977],
  "wrexham": [53.0461, -2.9921],
  "bangor": [53.2274, -4.1293],
  "bangor (wales)": [53.2274, -4.1293],
  "caernarfon": [53.1390, -4.2762],
  "aberystwyth": [52.4153, -4.0829],
  "llandudno": [53.3240, -3.8264],
  "rhyl": [53.3197, -3.4907],
  "stirling": [56.1165, -3.9369],
  "perth": [56.3950, -3.4291],
  "st andrews": [56.3398, -2.7966],
  "falkirk": [56.0019, -3.7839],
  "dumfries": [55.0707, -3.6051],
  "ayr": [55.4628, -4.6292],
  "kilmarnock": [55.6110, -4.4946],
  "paisley": [55.8452, -4.4234],
  "motherwell": [55.7946, -3.9923],
  "hamilton": [55.7775, -4.0394],
  "livingston": [55.8845, -3.5153],
  "derry": [54.9966, -7.3086],
  "londonderry": [54.9966, -7.3086],
  "newry": [54.1751, -6.3402],
  "armagh": [54.3503, -6.6528],
  "lisburn": [54.5162, -6.0580],
  "heathrow": [51.4700, -0.4543],
  "gatwick": [51.1537, -0.1821],
  "stansted": [51.8850, 0.2350],
  "luton airport": [51.8746, -0.3683],
  "birmingham airport": [52.4539, -1.7480],
  "manchester airport": [53.3650, -2.2726],
};

/**
 * Geocode a place name to [lat, lon].
 * First checks the built-in UK cities dictionary, then falls back to Nominatim.
 */
export async function geocodePlace(place: string): Promise<[number, number] | null> {
  const key = place.toLowerCase().trim();
  if (geocodeCache.has(key)) return geocodeCache.get(key) ?? null;

  const city = UK_CITIES[key];
  if (city) {
    geocodeCache.set(key, city);
    return city;
  }

  try {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?q=${encodeURIComponent(place)},United+Kingdom` +
      `&format=json&limit=1&countrycodes=gb`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Roci-SKU-Platform/1.0" },
    });
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (data[0]) {
      const coords: [number, number] = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
      geocodeCache.set(key, coords);
      return coords;
    }
  } catch { /* ignore network errors */ }

  geocodeCache.set(key, null);
  return null;
}

/**
 * Fetch driving route coordinates from OSRM.
 * Falls back to a straight line if OSRM is unavailable.
 * Returns Leaflet [lat, lon] pairs.
 */
export async function fetchRouteCoords(
  from: [number, number],
  to: [number, number],
): Promise<[number, number][]> {
  const key = `${from[0].toFixed(4)},${from[1].toFixed(4)};${to[0].toFixed(4)},${to[1].toFixed(4)}`;
  if (routeCache.has(key)) return routeCache.get(key)!;

  try {
    // OSRM expects lon,lat (GeoJSON order)
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${from[1].toFixed(5)},${from[0].toFixed(5)};` +
      `${to[1].toFixed(5)},${to[0].toFixed(5)}` +
      `?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json() as {
      routes?: [{ geometry: { coordinates: [number, number][] } }];
    };
    if (data.routes?.[0]?.geometry?.coordinates) {
      // Convert [lon, lat] → [lat, lon] for Leaflet
      const coords: [number, number][] = data.routes[0].geometry.coordinates.map(
        ([lon, lat]) => [lat, lon],
      );
      routeCache.set(key, coords);
      return coords;
    }
  } catch { /* ignore */ }

  // Fallback: straight line
  const fallback: [number, number][] = [from, to];
  routeCache.set(key, fallback);
  return fallback;
}
