import {
  bundledHighlightsForVersion,
  formatReleaseNotesForNotification,
  mergeReleaseHighlights,
} from "../src/data/releaseNotes";
import { parseUpdaterReleaseNotes } from "./release-notes-parse";

export function resolveReleaseHighlights(
  version: string,
  updaterRaw: unknown,
): string[] {
  const fromUpdater = parseUpdaterReleaseNotes(updaterRaw);
  return mergeReleaseHighlights(version, fromUpdater);
}

export function notificationBodyForRelease(
  version: string,
  updaterRaw: unknown,
): string {
  const highlights = resolveReleaseHighlights(version, updaterRaw);
  return formatReleaseNotesForNotification(version, highlights);
}

export { bundledHighlightsForVersion, mergeReleaseHighlights };
