const elements = new Set([
  'svg',
  'g',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'defs',
  'linearGradient',
  'radialGradient',
  'stop',
  'clipPath',
  'mask',
  'title',
  'desc',
  'text',
  'tspan',
  'symbol',
  'use',
  'pattern',
  'style',
]);
function validateStaticStyle(value: string) {
  const css = value.replace(/\/\*[\s\S]*?\*\//g, '');
  if (/[@\\&<>]|javascript:|data:|https?:|expression\s*\(|behavior\s*:|-moz-binding/i.test(css))
    throw new Error('SVG contém estilos ou recursos externos não permitidos.');
  for (const match of css.matchAll(/url\s*\(([^)]*)\)/gi))
    if (!/^\s*['"]?#[\w.-]+['"]?\s*$/.test(match[1]))
      throw new Error('SVG contém recursos externos não permitidos.');
}
/** Accept a static SVG subset. Reject active content, remote resources and external entities. */
export function sanitizeSvg(source: string): { text: string; width: number; height: number } {
  const text = source
    .replace(/^\uFEFF/, '')
    .replace(/<\?xml\s[^?]*\?>/i, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();
  if (!text.startsWith('<svg') || /<!|<\?/.test(text) || text.includes(String.fromCharCode(0)))
    throw new Error('SVG inválido: use um arquivo vetorial estático, sem entidades externas.');
  const stack: string[] = [];
  let root = false;
  let closed = false;
  let end = 0;
  let width = 0,
    height = 0;
  let count = 0;
  const tags = /<(\/?)([A-Za-z][\w-]*)([^<>]*?)(\/?)>/g;
  for (const match of text.matchAll(tags)) {
    if (stack.at(-1) === 'style') validateStaticStyle(text.slice(end, match.index));
    if (text.slice(end, match.index).includes('<')) throw new Error('SVG malformado.');
    end = (match.index ?? 0) + match[0].length;
    const [, closing, name, raw, selfClosing] = match;
    if (!elements.has(name) || closed || ++count > 10000)
      throw new Error('SVG contém elementos não permitidos.');
    if (closing) {
      if (raw.trim() || selfClosing || stack.pop() !== name) throw new Error('SVG malformado.');
      if (!stack.length) closed = true;
      continue;
    }
    if (!root) {
      if (name !== 'svg') throw new Error('SVG inválido.');
      root = true;
    }
    const attributes = /([A-Za-z_:][\w:.-]*)\s*=\s*("[^"]*"|'[^']*')/g;
    let offset = 0;
    const values: Record<string, string> = {};
    for (const attribute of raw.matchAll(attributes)) {
      if (raw.slice(offset, attribute.index).trim()) throw new Error('Atributos SVG inválidos.');
      offset = (attribute.index ?? 0) + attribute[0].length;
      const key = attribute[1];
      const value = attribute[2].slice(1, -1);
      const lower = key.toLowerCase();
      if (
        values[key] !== undefined ||
        lower.startsWith('on') ||
        lower === 'xml:base' ||
        (/:/.test(key) && !['xmlns:xlink', 'xlink:href', 'xml:space'].includes(lower))
      )
        throw new Error('SVG contém atributos não permitidos.');
      if (lower === 'xmlns' && value !== 'http://www.w3.org/2000/svg')
        throw new Error('Namespace SVG inválido.');
      if (lower === 'xmlns:xlink' && value !== 'http://www.w3.org/1999/xlink')
        throw new Error('Namespace SVG inválido.');
      if (['href', 'xlink:href'].includes(lower) && !/^#[\w.-]+$/.test(value))
        throw new Error('Referências externas não são permitidas no SVG.');
      if (
        !lower.startsWith('xmlns') &&
        (/(?:javascript:|data:|https?:|@import|expression\s*\()/i.test(value) ||
          (lower !== 'style' && /url\s*\(/i.test(value) && !/^url\(\s*#[\w.-]+\s*\)$/i.test(value)))
      )
        throw new Error('SVG contém estilos ou recursos externos não permitidos.');
      if (lower === 'style') validateStaticStyle(value);
      values[key] = value;
    }
    if (raw.slice(offset).trim()) throw new Error('Atributos SVG inválidos.');
    if (name === 'svg' && !stack.length) {
      const box = values.viewBox
        ?.trim()
        .split(/[\s,]+/)
        .map(Number);
      width = /^\d+(?:\.\d+)?(?:px)?$/.test(values.width ?? '')
        ? parseFloat(values.width)
        : box?.length === 4
          ? box[2]
          : 0;
      height = /^\d+(?:\.\d+)?(?:px)?$/.test(values.height ?? '')
        ? parseFloat(values.height)
        : box?.length === 4
          ? box[3]
          : 0;
    }
    if (!selfClosing) {
      stack.push(name);
      if (stack.length > 100) throw new Error('SVG muito complexo.');
    } else if (!stack.length) closed = true;
  }
  if (
    !root ||
    !closed ||
    stack.length ||
    text.slice(end).trim() ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    width > 16384 ||
    height > 16384
  )
    throw new Error('SVG inválido. Informe dimensões ou um viewBox válido.');
  return { text, width, height };
}
