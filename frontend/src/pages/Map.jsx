// Map page showing EV charging stations in Dubai/UAE
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Charging station data
const stations = [
  { id: 1, name: "DEWA Charging - Dubai Mall", lat: 25.1972, lng: 55.2796, type: "fast", power: "50 kW DC" },
  { id: 2, name: "ADNOC - Sheikh Zayed Road", lat: 25.2285, lng: 55.2842, type: "fast", power: "60 kW DC" },
  { id: 3, name: "Mall of the Emirates", lat: 25.1181, lng: 55.2006, type: "standard", power: "22 kW AC" },
  { id: 4, name: "Tesla Supercharger - Marina", lat: 25.0805, lng: 55.1403, type: "tesla", power: "150 kW DC" },
  { id: 5, name: "ENOC - Al Barsha", lat: 25.1134, lng: 55.1943, type: "fast", power: "50 kW DC" },
  { id: 6, name: "Dubai Festival City", lat: 25.2227, lng: 55.3530, type: "standard", power: "11 kW AC" },
  { id: 7, name: "DEWA - Jumeirah Beach", lat: 25.1425, lng: 55.1857, type: "fast", power: "50 kW DC" },
  { id: 8, name: "Tesla Supercharger - Downtown", lat: 25.1864, lng: 55.2636, type: "tesla", power: "250 kW DC" },
  { id: 9, name: "City Centre Deira", lat: 25.2520, lng: 55.3318, type: "standard", power: "7 kW AC" },
  { id: 10, name: "ADNOC - Business Bay", lat: 25.1850, lng: 55.2650, type: "fast", power: "60 kW DC" },
]

// Create colored circle marker icon
const createIcon = (color) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

// Icon colors by charger type
const icons = {
  fast: createIcon('#ef4444'),
  standard: createIcon('#3b82f6'),
  tesla: createIcon('#a855f7'),
}

// Display labels for charger types
const typeLabels = {
  fast: 'Fast Charger',
  standard: 'Standard Charger',
  tesla: 'Tesla Supercharger',
}

export default function Map() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h1 className="text-3xl font-bold mb-2">EV Charging Stations</h1>
      <p className="text-gray-600 mb-4">Find charging stations across the UAE</p>
      
      <div className="rounded-lg overflow-hidden shadow-md" style={{ height: '500px' }}>
        <MapContainer
          center={[25.2048, 55.2708]}
          zoom={11}
          style={{ height: '100%', width: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://tiles.stadiamaps.com/tiles/osm_bright/{z}/{x}/{y}{r}.png?language=en"
          />
          {stations.map((station) => (
            <Marker
              key={station.id}
              position={[station.lat, station.lng]}
              icon={icons[station.type]}
            >
              <Popup>
                <strong>{station.name}</strong><br />
                <span className="text-gray-500">Type:</span> {typeLabels[station.type]}<br />
                <span className="text-gray-500">Power:</span> {station.power}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span className="text-sm text-gray-700">Fast Charger (DC 50kW+)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          <span className="text-sm text-gray-700">Standard Charger (AC 7-22kW)</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-purple-500"></span>
          <span className="text-sm text-gray-700">Tesla Supercharger</span>
        </div>
      </div>
    </div>
  )
}
