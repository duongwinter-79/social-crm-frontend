function mojibakeScore(value: string): number {
  return value.match(/Ã|Ä|Â|áº|á»|�|[\u0080-\u009f]/g)?.length ?? 0;
}

export function repairUtf8DecodedAsLatin1(value: string): string {
  const originalScore = mojibakeScore(value);
  if (originalScore === 0) return value;

  const bytes = Uint8Array.from(Array.from(value, (char) => char.charCodeAt(0) & 0xff));
  const repaired = new TextDecoder("utf-8").decode(bytes);
  return mojibakeScore(repaired) < originalScore ? repaired : value;
}
