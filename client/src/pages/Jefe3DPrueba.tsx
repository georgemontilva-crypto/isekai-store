import GuardianVivo from "@/components/fest/GuardianVivo";

/** Vista previa del Guardián animado: una página suelta, sin enlaces desde la web */
export default function Jefe3DPrueba() {
  return (
    <div className="jefe3d-prueba">
      <p className="jefe3d-prueba-t">Vista previa · El Guardián del Portal</p>
      <div className="jefe3d-prueba-caja"><GuardianVivo /></div>
      <p className="jefe3d-prueba-s">Ataca con un brazo y luego el otro; cada 10 segundos carga aura y la suelta. En computadora te sigue con el ratón.</p>
    </div>
  );
}
