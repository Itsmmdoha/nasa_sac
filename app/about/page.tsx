import { Page } from "@/components/Page";
import en from "@/i18n/en.json";

export default function AboutPage() {
  return (
    <Page>
      <h2>{en.about.title}</h2>
      <p>
        Orbit2Field scores every rotation from NASA POWER climate, cached SMAP soil moisture and
        MODIS greenness, and SRDI soil. A System One model then picks one rotation from that list
        and says how confident it is. If it is not sure, the result is flagged.
      </p>
      <p>
        The same model reads English and Bangla market headlines for an early glut. The zone plan
        for the upazila keeps one crop from taking every field: mustard goes to the fields where it
        fits best, and other suitable fields move to lentil or maize. A farm that gives up the top
        crop is first for it next season.
      </p>
      <p>
        A language model only explains the assignment. It does not choose the crop, and it does not
        invent the scores.
      </p>
      <h2>Data sources</h2>
      <ul className="plain-list">
        <li>NASA POWER: rainfall, temperature, soil wetness</li>
        <li>NASA AppEEARS: SMAP L4 moisture, MODIS NDVI (prefetched)</li>
        <li>SRDI via BARC Crop Zoning: soil samples and fertilizer doses</li>
        <li>Market headlines in data/market/headlines.json: English and Bangla</li>
      </ul>
    </Page>
  );
}
