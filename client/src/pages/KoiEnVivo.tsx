import KoiBatalla from "@/components/fest/KoiBatalla";
import { useLang } from "@/i18n/LangContext";

/**
 * Pantalla de transmisión de la batalla de Koi-sama: solo se mira.
 * Pensada para proyectar o compartir pantalla: el pez recibiendo los golpes
 * de todos, la vida en vivo, quién hace más daño y, al final, el ganador.
 */
export default function KoiEnVivo() {
  const { lang } = useLang();
  return (
    <div className="koi-live">
      <KoiBatalla en={lang === "en"} soloVer />
    </div>
  );
}
