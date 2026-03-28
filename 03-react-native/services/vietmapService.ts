import AsyncStorage from '@react-native-async-storage/async-storage';

const TILEMAP_KEY = '71f1014b3a0861668824a95c85ba1523a3098c2b20058f46';
const SERVICES_KEY = 'b0195ed21449e7a1466290aba7590b63459a35eacc591d48';

// Helper để parse JSON an toàn
const safeParseJSON = async (res: Response) => {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    console.warn('[Vietmap] Phản hồi không phải JSON:', res.url);
    return null;
  }
};

/**
 * Lấy URL Tile cho Bản đồ Raster Vietmap
 */
export const getVietmapTileUrl = () => {
  return `https://maps.vietmap.vn/api/tm/{z}/{x}/{y}@2x.png?apikey=${TILEMAP_KEY}`;
};

/**
 * Gọi API Chỉ đường của Vietmap
 */
export const getVietmapRoute = async (startLat: number, startLng: number, endLat: number, endLng: number) => {
  try {
    const url = `https://maps.vietmap.vn/api/route?api-version=1.1&apikey=${SERVICES_KEY}&point=${startLat},${startLng}&point=${endLat},${endLng}&vehicle=car`;
    const res = await fetch(url);
    const data = await safeParseJSON(res);
    if (data && data.paths && data.paths.length > 0) {
      return {
        points: decodePolyline(data.paths[0].points),
        distance: data.paths[0].distance, // in meters
        time: data.paths[0].time, // in ms
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching Vietmap route:', error);
    return null;
  }
};

/**
 * Tìm kiếm địa chỉ (Autocomplete/Search)
 */
export const searchVietmapAddress = async (text: string, lat?: number, lng?: number) => {
  try {
    let url = `https://maps.vietmap.vn/api/search/v3?apikey=${SERVICES_KEY}&text=${encodeURIComponent(text)}`;
    if (lat && lng) {
      url += `&focus=${lat},${lng}`;
    }
    const res = await fetch(url);
    const data = await safeParseJSON(res);
    return data || [];
  } catch (error) {
    console.error('Error searching address:', error);
    return [];
  }
};

/**
 * Decode Polyline algorithm
 */
function decodePolyline(encoded: string) {
  let currentPosition = 0;
  let currentLat = 0;
  let currentLng = 0;
  const dataLength = encoded.length;
  const polyline: { latitude: number; longitude: number }[] = [];

  while (currentPosition < dataLength) {
    let shift = 0;
    let result = 0;
    let byte;
    do {
      byte = encoded.charCodeAt(currentPosition++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    currentLat += deltaLat;

    shift = 0;
    result = 0;
    do {
      byte = encoded.charCodeAt(currentPosition++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    currentLng += deltaLng;

    polyline.push({ latitude: currentLat / 1e5, longitude: currentLng / 1e5 });
  }
  return polyline;
}

/**
 * Quản lý Địa điểm Lưu Trữ (Saved Locations)
 */
export const saveLocation = async (name: string, lat: number, lng: number, address: string) => {
  try {
    const existing = await AsyncStorage.getItem('@saved_locations');
    const locations = existing ? JSON.parse(existing) : [];
    locations.push({ id: Date.now().toString(), name, lat, lng, address });
    await AsyncStorage.setItem('@saved_locations', JSON.stringify(locations));
    return locations;
  } catch (error) {
    return [];
  }
};

export const getSavedLocations = async () => {
  try {
    const existing = await AsyncStorage.getItem('@saved_locations');
    return existing ? JSON.parse(existing) : [];
  } catch (error) {
    return [];
  }
};
