import type { MetadataRoute } from "next";

/** Lets people "Add to Home Screen" and open the site like an app */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "SHPE LAMC",
    short_name: "SHPE LAMC",
    description: "SHPE chapter at Los Angeles Mission College: events, scholarships, games, and how to join.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#001F5B",
    icons: [{ src: "/images/symbol.png", sizes: "709x708", type: "image/png", purpose: "any" }],
  };
}
