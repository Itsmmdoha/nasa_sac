"use client";

import { useState } from "react";
import { FarmerForm } from "@/components/FarmerForm";
import { Page } from "@/components/Page";

export default function HomePage() {
  const [place, setPlace] = useState("Kalma");

  return (
    <Page place={place}>
      <FarmerForm onPlaceChange={setPlace} />
    </Page>
  );
}
