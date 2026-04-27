export function SunoPlayer({ songId, isVisible = true }: { songId: string | null; isVisible?: boolean }) {
  if (!songId || !isVisible) return null;
  
  return (
    <iframe
      src={`https://suno.com/embed/${songId}`}
      width="100%"
      height="152"
      frameBorder="0"
      allow="autoplay; encrypted-media; fullscreen"
      allowFullScreen
      loading="lazy"
      referrerPolicy="no-referrer-when-downgrade"
    />
  );
}

export function parseSunoId(input: string): string | null {
  if (!input) return null;
  const uuidRegex = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/i;
  const match = input.match(uuidRegex);
  if (match && match[1]) {
    return match[1];
  }
  return null;
}
