/**
 * El logo de Isekai World hecho letrero de neón: el aro magenta, la media
 * luna amarilla y la calavera, cada uno un tubo de vidrio. Al cargar se
 * enciende por partes, con el parpadeo de un tubo que arranca en frío.
 *
 * Cada color va en su propia capa <svg> porque el resplandor es un filtro de
 * CSS, y Safari solo lo aplica bien al <svg> entero, no a sus piezas.
 */
const circulo = (cx: number, cy: number, r: number) => `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${2 * r} 0 a ${r} ${r} 0 1 0 ${-2 * r} 0`;

const ARO = [circulo(540, 540, 474)];
const LUNA = ["M 229 260 A 418 418 0 1 1 809 860"];
const CRANEO = [
  "M 300 432 C 332 362 420 268 540 268 C 660 268 748 362 780 432 C 816 560 800 634 736 642 C 688 670 660 714 664 766 C 660 800 636 814 604 812 L 466 812 C 436 814 414 800 410 766 C 414 714 384 670 342 642 C 280 634 264 560 300 432 Z",
  circulo(431, 501, 80),
  circulo(650, 501, 80),
  "M 494 808 L 494 744",
  "M 580 808 L 580 744",
];
const PUPILAS = [circulo(431, 501, 14), circulo(650, 501, 14)];

function Capa({ clase, trazos, apagado }: { clase: string; trazos: string[]; apagado?: boolean }) {
  return (
    <svg className={`neon__capa ${clase}`} viewBox="0 0 1080 1080" aria-hidden="true" focusable="false">
      {trazos.map(d => <path key={d} className="neon__tubo" d={d} />)}
      {!apagado && trazos.map(d => <path key={`n${d}`} className="neon__nucleo" d={d} />)}
    </svg>
  );
}

export default function LetreroNeon() {
  return (
    <div className="neon" role="img" aria-label="Isekai World">
      <span className="neon__halo" aria-hidden="true" />
      {/* El vidrio apagado: lo que se ve antes de encender */}
      <Capa clase="neon__apagado" trazos={[...ARO, ...LUNA, ...CRANEO, ...PUPILAS]} apagado />
      <Capa clase="neon__luz neon__luz--aro" trazos={ARO} />
      <Capa clase="neon__luz neon__luz--luna" trazos={LUNA} />
      <Capa clase="neon__luz neon__luz--craneo" trazos={CRANEO} />
      <Capa clase="neon__luz neon__luz--pupilas" trazos={PUPILAS} />
    </div>
  );
}
