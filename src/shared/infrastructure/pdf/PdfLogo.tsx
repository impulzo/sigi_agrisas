import React from "react";
import { Image } from "@react-pdf/renderer";
import { resolvePdfLogoSource } from "./resolvePdfLogoSource";

interface PdfLogoProps {
  logoUrl: string | null | undefined;
  size?: number;
}

export function PdfLogo({ logoUrl, size = 48 }: PdfLogoProps) {
  return (
    <Image
      src={resolvePdfLogoSource(logoUrl)}
      style={{ width: size, height: size, objectFit: "contain" }}
    />
  );
}
