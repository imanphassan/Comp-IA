// Map page showing EV car dealerships in Dubai/UAE
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// EV dealership data
const dealerships = [
  { id: 1, name: "Tesla Dubai - Sheikh Zayed Road", lat: 25.2285, lng: 55.2842, type: "tesla", brands: "Tesla" },
  { id: 2, name: "Al Futtaim Electric - Festival City", lat: 25.2227, lng: 55.3530, type: "multi", brands: "BMW, MINI, Polestar" },
  { id: 3, name: "Mercedes EQ Center - Dubai Mall", lat: 25.1972, lng: 55.2796, type: "luxury", brands: "Mercedes-Benz EQ" },
  { id: 4, name: "BYD Dubai - Al Quoz", lat: 25.1134, lng: 55.1943, type: "multi", brands: "BYD" },
  { id: 5, name: "Porsche Taycan Center - Marina", lat: 25.0805, lng: 55.1403, type: "luxury", brands: "Porsche" },
  { id: 6, name: "Audi e-tron Showroom - Business Bay", lat: 25.1850, lng: 55.2650, type: "luxury", brands: "Audi" },
  { id: 7, name: "Hyundai EV Gallery - Deira", lat: 25.2520, lng: 55.3318, type: "multi", brands: "Hyundai, Kia" },
  { id: 8, name: "Tesla Service Center - Downtown", lat: 25.1864, lng: 55.2636, type: "tesla", brands: "Tesla" },
  { id: 9, name: "Rivian UAE - Mall of Emirates", lat: 25.1181, lng: 55.2006, type: "multi", brands: "Rivian" },
  { id: 10, name: "Lucid Motors - Jumeirah", lat: 25.1425, lng: 55.1857, type: "luxury", brands: "Lucid" },
]

// Create colored circle marker icon
const createIcon = (color) => L.divIcon({
  className: 'custom-marker',
  html: `<div style="background:${color};width:24px;height:24px;border-radius:50%;border:3px solid white;box-shadow:0 2px 5px rgba(0,0,0,0.3);"></div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

// Icon colors by dealership type
const icons = {
  tesla: createIcon('#ef4444'),
  luxury: createIcon('#a855f7'),
  multi: createIcon('#3b82f6'),
}

// Display labels for dealership types
const typeLabels = {
  tesla: 'Tesla Dealership',
  luxury: 'Luxury EV Dealership',
  multi: 'Multi-Brand EV Dealership',
}

export default function Map() {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h1 className="text-3xl font-bold mb-2">EV Car Dealerships</h1>
      <p className="text-gray-600 mb-4">Find EV dealerships across the UAE</p>
      
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
          {dealerships.map((dealership) => (
            <Marker
              key={dealership.id}
              position={[dealership.lat, dealership.lng]}
              icon={icons[dealership.type]}
            >
              <Popup>
                <strong>{dealership.name}</strong><br />
                <span className="text-gray-500">Type:</span> {typeLabels[dealership.type]}<br />
                <span className="text-gray-500">Brands:</span> {dealership.brands}
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-red-500"></span>
          <span className="text-sm text-gray-700">Tesla Dealership</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-blue-500"></span>
          <span className="text-sm text-gray-700">Multi-Brand EV Dealership</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-purple-500"></span>
          <span className="text-sm text-gray-700">Luxury EV Dealership</span>
        </div>
      </div>
    </div>
  )
}
