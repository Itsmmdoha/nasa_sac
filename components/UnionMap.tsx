"use client";

import dynamic from "next/dynamic";

const MapInner = dynamic(() => import("./UnionMapInner"), { ssr: false });

export function UnionMap(props: { lat: number; lon: number; label: string }) {
  return (
    <div className="map-frame">
      <MapInner {...props} />
    </div>
  );
}
