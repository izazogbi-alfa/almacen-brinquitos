import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Almacén — Existencias, pedidos y recepción",
    short_name: "Almacén",
    description:
      "Consulta existencias, arma pedidos a proveedor y recibe mercancía contra la orden.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4faf9",
    theme_color: "#0f766e",
    lang: "es-MX",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
