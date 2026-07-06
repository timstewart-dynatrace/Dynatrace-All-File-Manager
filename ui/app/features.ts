import type { AppFeature } from "./types/appFeature";
import { ENABLED_FEATURES } from "./appTarget";

export interface FeatureDescriptor {
  id: AppFeature;
  path: string;
  navLabel: string;
  cardName: string;
  cardIconLight: string;
  cardIconDark: string;
}

export const FEATURE_REGISTRY: Record<AppFeature, FeatureDescriptor> = {
  notebooks: {
    id: "notebooks",
    path: "/notebook-manager",
    navLabel: "Notebooks",
    cardName: "Notebooks",
    cardIconLight: "./assets/notebook.svg",
    cardIconDark: "./assets/notebook_dark.svg",
  },
  dashboards: {
    id: "dashboards",
    path: "/dashboard-manager",
    navLabel: "Dashboards",
    cardName: "Dashboards",
    cardIconLight: "./assets/dashboard.svg",
    cardIconDark: "./assets/dashboard_dark.svg",
  },
  lookup: {
    id: "lookup",
    path: "/lookup-file-manager",
    navLabel: "Lookup Tables",
    cardName: "Lookup Tables",
    cardIconLight: "./assets/lookup.svg",
    cardIconDark: "./assets/lookup_dark.svg",
  },
  documents: {
    id: "documents",
    path: "/file-manager",
    navLabel: "Documents",
    cardName: "Documents",
    cardIconLight: "./assets/document.svg",
    cardIconDark: "./assets/document_dark.svg",
  },
};

export const ENABLED_FEATURE_LIST: FeatureDescriptor[] = ENABLED_FEATURES.map(
  (id) => FEATURE_REGISTRY[id]
);

export const isFeatureEnabled = (id: AppFeature): boolean =>
  ENABLED_FEATURES.includes(id);
