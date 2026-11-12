"use client";

import { MapContainer, Marker, TileLayer, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const icon = L.divIcon({
  className: "fs-pin",
  html: '<svg width="30" height="40" viewBox="0 0 30 40"><path d="M15 39s13-13.4 13-23A13 13 0 0 0 2 16c0 9.6 13 23 13 23Z" fill="#2f6b3a" stroke="#fffbf3" stroke-width="2"/><circle cx="15" cy="15" r="5" fill="#f2d04b"/></svg>',
  iconSize: [30, 40],
  iconAnchor: [15, 39],
  popupAnchor: [0, -34],
});

export default function UnionMapInner({
  lat,
  lon,
  label,
}: {
  lat: number;
  lon: number;
  label: string;
}) {
  return (
    <MapContainer center={[lat, lon]} zoom={11} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[lat, lon]} icon={icon}>
        <Popup>{label}</Popup>
      </Marker>
    </MapContainer>
  );
}
