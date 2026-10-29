import type { NeisSchoolRow } from "@/types/state";
import type { WeatherGeocodePlace } from "@/types/weather";

export function formatGeocodeLabel(place: WeatherGeocodePlace): string {
  const name = place.name.trim();
  const admin1 = place.admin1.trim();
  if (name && admin1) return `${name} · ${admin1}`;
  return name || admin1 || "지역";
}

export function geocodeQueryForSchool(school: NeisSchoolRow): string {
  const address = school.address.trim();
  if (address) return address;
  const location = school.locationName.trim();
  const name = school.name.trim();
  if (location && name) return `${location} ${name}`;
  return name || location;
}
