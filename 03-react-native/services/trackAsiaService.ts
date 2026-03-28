import AsyncStorage from '@react-native-async-storage/async-storage';

export const TRACKASIA_API_KEY = '9cb71773659040a8af8b9d0b56ed01e032';

// Helper để parse JSON an toàn
const safeParseJSON = async (res: Response) => {
  try {
    const text = await res.text();
    if (!text) return null;
    return JSON.parse(text);
  } catch (e) {
    console.warn('[TrackAsia] Phản hồi không phải JSON:', res.url);
    return null;
  }
};

/**
 * Lấy URL Tile cho Bản đồ Raster TrackAsia
 */
export const getTrackAsiaTileUrl = () => {
  return `https://a.tile.openstreetmap.org/{z}/{x}/{y}.png`;
};

/**
 * Gọi API Chỉ đường của TrackAsia
 */
export const getTrackAsiaRoute = async (startLat: number, startLng: number, endLat: number, endLng: number) => {
  try {
    const url = `https://maps.track-asia.com/route/v1/car/${startLng},${startLat};${endLng},${endLat}.json?key=${TRACKASIA_API_KEY}&overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await safeParseJSON(res);
    
    if (data && data.routes && data.routes.length > 0) {
      const route = data.routes[0];
      // geometry is geojson LineString: [[lng, lat], [lng, lat]]
      const coords = route.geometry.coordinates.map((coord: [number, number]) => ({
        latitude: coord[1],
        longitude: coord[0],
      }));
      
      return {
        points: coords,
        distance: route.distance, // in meters
        time: route.duration, // in seconds (need to map to MS if logic expected MS, but we'll return raw duration)
      };
    }
    return null;
  } catch (error) {
    console.error('Error fetching TrackAsia route:', error);
    return null;
  }
};

/**
 * Tìm kiếm địa chỉ (Autocomplete/Search) TrackAsia
 */
export const searchTrackAsiaAddress = async (text: string, lat?: number, lng?: number) => {
  try {
    // Focus param is not fully standard in TrackAsia autocomplete like Vietmap, but we can pass text.
    let url = `https://maps.track-asia.com/api/v1/autocomplete?text=${encodeURIComponent(text)}&key=${TRACKASIA_API_KEY}`;
    if (lat && lng) {
      // url += `&focus.point.lat=${lat}&focus.point.lon=${lng}`; // Uncomment if API supports
    }
    const res = await fetch(url);
    const data = await safeParseJSON(res);
    // TrackAsia returns GeoJSON FeatureCollection
    if (data && data.features) {
      return data.features.map((f: any) => ({
        id: f.properties.id || f.id,
        name: f.properties.name || f.properties.label,
        address: f.properties.label,
        lat: f.geometry.coordinates[1],
        lng: f.geometry.coordinates[0],
      }));
    }
    return [];
  } catch (error) {
    console.error('Error searching address:', error);
    return [];
  }
};

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
