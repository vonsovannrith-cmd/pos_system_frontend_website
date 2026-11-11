/* eslint-disable @next/next/no-img-element */

type Props = { src: string | null; alt: string; className?: string };

export default function ProductThumb({ src, alt, className = "" }: Props) {
  if (!src) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex items-center justify-center bg-gray-100 text-2xl text-gray-300 ${className}`}
      >
        🛍
      </div>
    );
  }
  return <img src={src} alt={alt} loading="lazy" className={`object-cover ${className}`} />;
}