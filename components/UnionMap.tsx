"use client";

import dynamic from "next/dynamic";

const MapInner = dynamic(() => import("./UnionMapInner"), { ssr: false });

export function UnionMap(props: { lat: number; lon: number; label: string }) {
  return (
    <div className="h-48 w-full overflow-hidden rounded-lg border border-stone-200">
      <MapInner {...props} />
    </div>
  );
}
