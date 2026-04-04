interface AdSenseProps {
  slot: string;
  format?: string;
  responsive?: boolean;
}

export function AdSense({ slot, format = 'auto', responsive = true }: AdSenseProps) {
  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client="ca-pub-6870676006996989"
      data-ad-slot={slot}
      data-ad-format={format}
      data-full-width-responsive={responsive ? 'true' : 'false'}
    />
  );
}
