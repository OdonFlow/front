import { maxImageBytes, type BrandAsset } from './types.ts';
import { sanitizeSvg } from './svg.ts';
const crcTable = Uint32Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let i = 0; i < 8; i++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc(bytes: Uint8Array) {
  let c = 0xffffffff;
  for (const b of bytes) c = crcTable[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
const concat = (parts: Uint8Array[]) => {
  const result = new Uint8Array(parts.reduce((sum, p) => sum + p.length, 0));
  let at = 0;
  for (const part of parts) {
    result.set(part, at);
    at += part.length;
  }
  return result;
};
function pngChunk(type: string, data: Uint8Array) {
  const bytes = new Uint8Array(data.length + 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(0, data.length);
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(data, 8);
  view.setUint32(bytes.length - 4, crc(bytes.slice(4, -4)));
  return bytes;
}
async function readLimited(stream: ReadableStream<Uint8Array>, limit: number) {
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        throw new Error('PNG descompactado excede o limite.');
      }
      parts.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  return concat(parts);
}
export async function optimizePng(bytes: Uint8Array<ArrayBuffer>) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (signature.some((n, i) => bytes[i] !== n))
    throw new Error('O conteúdo do arquivo não é uma imagem PNG válida.');
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let at = 8;
  const chunks: { type: string; data: Uint8Array; raw: Uint8Array }[] = [];
  while (at + 12 <= bytes.length) {
    const length = view.getUint32(at);
    if (at + length + 12 > bytes.length) throw new Error('PNG incompleto.');
    const type = new TextDecoder().decode(bytes.slice(at + 4, at + 8));
    const raw = bytes.slice(at, at + length + 12);
    if (crc(raw.slice(4, -4)) !== view.getUint32(at + length + 8))
      throw new Error('PNG corrompido.');
    chunks.push({ type, data: raw.slice(8, -4), raw });
    at += length + 12;
    if (type === 'IEND') break;
  }
  if (
    at !== bytes.length ||
    chunks[0]?.type !== 'IHDR' ||
    chunks[0].data.length !== 13 ||
    chunks.at(-1)?.type !== 'IEND' ||
    !chunks.some((c) => c.type === 'IDAT')
  )
    throw new Error('Estrutura PNG inválida.');
  const header = new DataView(
    chunks[0].data.buffer,
    chunks[0].data.byteOffset,
    chunks[0].data.byteLength,
  );
  const width = header.getUint32(0),
    height = header.getUint32(4);
  if (!width || !height || width > 16384 || height > 16384 || width * height > 16777216)
    throw new Error('A imagem deve ter no máximo 16 megapixels e 16.384px por lado.');
  let optimized = bytes;
  if (typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined') {
    const idat = concat(chunks.filter((c) => c.type === 'IDAT').map((c) => c.data));
    const raw = await readLimited(
      new Blob([idat]).stream().pipeThrough(new DecompressionStream('deflate')),
      Math.min(140000000, width * height * 8 + height * 16 + 65536),
    );
    // Recompress the original filtered pixel bytes; no canvas conversion, resampling or alpha loss.
    const compressed = new Uint8Array(
      await new Response(
        new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate')),
      ).arrayBuffer(),
    );
    let emitted = false;
    const result = concat([
      bytes.slice(0, 8),
      ...chunks.flatMap((c) => {
        if (c.type !== 'IDAT') return [c.raw];
        if (emitted) return [];
        emitted = true;
        return [pngChunk('IDAT', compressed)];
      }),
    ]);
    if (result.length < bytes.length) optimized = result;
  }
  return { bytes: optimized, width, height };
}
export function toBase64(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}
export async function prepareBrandImage(file: Blob & { name?: string }): Promise<BrandAsset> {
  if (file.size <= 0 || file.size > maxImageBytes)
    throw new Error('Envie uma imagem PNG ou SVG de até 2 MB.');
  if (!['image/png', 'image/svg+xml'].includes(file.type))
    throw new Error('Formato não permitido. Use PNG ou SVG.');
  let bytes = new Uint8Array(await file.arrayBuffer());
  let width: number, height: number;
  if (file.type === 'image/svg+xml') {
    const result = sanitizeSvg(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
    bytes = new TextEncoder().encode(result.text);
    width = result.width;
    height = result.height;
  } else {
    const result = await optimizePng(bytes);
    bytes = result.bytes;
    width = result.width;
    height = result.height;
  }
  const url = `data:${file.type};base64,${toBase64(bytes)}`;
  if (typeof Image !== 'undefined')
    await new Promise<void>((resolve, reject) => {
      const image = new Image();
      const timeout = setTimeout(() => {
        image.src = '';
        reject(new Error('Não foi possível decodificar a imagem.'));
      }, 5000);
      image.onload = () => {
        clearTimeout(timeout);
        resolve();
      };
      image.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('A imagem não pôde ser aberta. Confira o arquivo enviado.'));
      };
      image.src = url;
    });
  return {
    id: crypto.randomUUID(),
    name: (file.name ?? 'marca').slice(0, 150),
    mime: file.type === 'image/png' ? 'image/png' : 'image/svg+xml',
    url,
    size: bytes.length,
    originalSize: file.size,
    width,
    height,
  };
}
