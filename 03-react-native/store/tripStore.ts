import { create } from 'zustand';

export interface TripOrder {
  id: string;
  status: string;
  exportWarehouse: string;
  destination: string;
  amount: number;
  product: string;
  createdAt?: string;
  deliveryDate?: string;
  driverId: string;
  currentLat?: number;
  currentLng?: number;
  destinationLat?: number;
  destinationLng?: number;
}

export interface LocationPoint {
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  timestamp: number;
}

interface TripState {
  activeTrip: TripOrder | null;
  allTrips: TripOrder[];
  currentLocation: LocationPoint | null;
  isTracking: boolean;
  
  routeCoordinates: { latitude: number; longitude: number }[];
  
  trackAsiaRoute: { latitude: number; longitude: number }[] | null;
  routeDistance: number;
  routeTime: number;

  customStartPoint: { lat: number; lng: number; name: string } | null;
  customEndPoint: { lat: number; lng: number; name: string } | null;

  statusId: number;

  setActiveTrip: (trip: TripOrder | null) => void;
  setAllTrips: (trips: TripOrder[]) => void;
  setCurrentLocation: (loc: LocationPoint) => void;
  addRouteCoordinate: (coord: { latitude: number; longitude: number }) => void;
  clearRoute: () => void;
  setTrackAsiaRoute: (route: { latitude: number; longitude: number }[] | null, dist?: number, time?: number) => void;
  setCustomPoints: (start: any, end: any) => void;
  setIsTracking: (val: boolean) => void;
  setStatusId: (id: number) => void;
}

export const useTripStore = create<TripState>((set) => ({
  activeTrip: null,
  allTrips: [],
  currentLocation: null,
  isTracking: false,
  routeCoordinates: [],
  trackAsiaRoute: null,
  routeDistance: 0,
  routeTime: 0,
  customStartPoint: null,
  customEndPoint: null,
  statusId: 0,

  setActiveTrip: (trip) => set({ activeTrip: trip }),
  setAllTrips: (trips) => set({ allTrips: trips }),
  setCurrentLocation: (loc) => set({ currentLocation: loc }),
  addRouteCoordinate: (coord) =>
    set((state) => ({
      routeCoordinates: [...state.routeCoordinates, coord],
    })),
  clearRoute: () => set({ routeCoordinates: [], trackAsiaRoute: null }),
  setTrackAsiaRoute: (route, dist = 0, time = 0) => set({ trackAsiaRoute: route, routeDistance: dist, routeTime: time }),
  setCustomPoints: (start, end) => set({ customStartPoint: start, customEndPoint: end }),
  setIsTracking: (val) => set({ isTracking: val }),
  setStatusId: (id) => set({ statusId: id }),
}));
