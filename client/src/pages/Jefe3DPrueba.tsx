import JefeModelo3D from "@/components/fest/JefeModelo3D";

/** Vista previa del Guardián en 3D: una página suelta, sin enlaces desde la web */
export default function Jefe3DPrueba() {
  return (
    <div className="jefe3d-prueba">
      <p className="jefe3d-prueba-t">Vista previa · El Guardián del Portal en 3D</p>
      <div className="jefe3d-prueba-caja"><JefeModelo3D /></div>
      <p className="jefe3d-prueba-s">Ataca con un brazo y luego el otro; cada 10 segundos carga aura y la suelta. En computadora te sigue con el ratón.</p>
    </div>
  );
}
