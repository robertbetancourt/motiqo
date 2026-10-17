"use client";
import { OpticalGallery, type OpticalGalleryProps } from "./optical-gallery";
import { irisSlides } from "./carousel-art";
export type { GallerySlide } from "./carousel-art";
export type ApertureCarouselProps = OpticalGalleryProps;
/** Iris: a six-leaf optical opening, with refraction and a luminous blade edge. */
export default function ApertureCarousel({
  duration = 1250,
  autoplay = 4000,
  ...props
}: ApertureCarouselProps) {
  return (
    <OpticalGallery
      {...props}
      defaults={irisSlides}
      duration={duration}
      autoplay={autoplay}
      mode="iris"
    />
  );
}
