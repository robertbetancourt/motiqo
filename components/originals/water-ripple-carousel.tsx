"use client";
import { OpticalGallery, type OpticalGalleryProps } from "./optical-gallery";
import { tidalSlides } from "./carousel-art";
export type { GallerySlide } from "./carousel-art";
export type WaterRippleCarouselProps = OpticalGalleryProps;
/** Tidal: a refractive wavefront with a smaller trailing capillary wake. */
export default function WaterRippleCarousel({
  autoplay = 4000,
  ...props
}: WaterRippleCarouselProps) {
  return (
    <OpticalGallery
      {...props}
      autoplay={autoplay}
      defaults={tidalSlides}
      mode="water"
    />
  );
}
