import React from 'react';

/**
 * Colores por tipo: los mismos que el calendario y la leyenda del cronograma.
 * Un "Traer" verde aquí y azul allí obligaría a aprender dos veces lo mismo.
 */
const ESTILO = {
  traer: { burbuja: 'bg-positive/22 text-positive', barra: 'bg-positive', punto: 'bg-positive' },
  llevar: { burbuja: 'bg-caution/22 text-caution', barra: 'bg-caution', punto: 'bg-caution' },
};

/*
 * Posición de cada burbuja, de mayor a menor, como porcentaje del área.
 * La grande arriba a la derecha y las otras solapándola por debajo: el
 * solapamiento es lo que las lee como partes de un mismo todo.
 */
const POSICIONES = [
  { left: '58%', top: '40%' },
  { left: '30%', top: '66%' },
  { left: '76%', top: '76%' },
];

const DIAMETRO_MAXIMO = 150;
const DIAMETRO_MINIMO = 48;

/**
 * Porcentajes enteros que suman exactamente 100.
 *
 * Redondear cada uno por separado da a veces 99 o 101, y una lista de
 * porcentajes que no suma 100 hace dudar de todas las demás cifras.
 * Se reparten los puntos que faltan entre los de mayor resto.
 */
const porcentajesExactos = (cuentas) => {
  const total = cuentas.reduce((s, c) => s + c, 0);
  if (total === 0) return cuentas.map(() => 0);

  const brutos = cuentas.map((c) => (c / total) * 100);
  const enteros = brutos.map(Math.floor);
  let faltan = 100 - enteros.reduce((s, n) => s + n, 0);

  brutos
    .map((b, i) => ({ i, resto: b - Math.floor(b) }))
    .sort((a, b) => b.resto - a.resto)
    .forEach(({ i }) => { if (faltan > 0) { enteros[i] += 1; faltan -= 1; } });

  return enteros;
};

/**
 * Recorridos del mes por tipo: burbujas proporcionales y, al lado, la misma
 * información en cifras exactas. La burbuja da la proporción de un vistazo;
 * la lista, el número que se puede citar.
 *
 * El área de cada burbuja, no su diámetro, es proporcional a la cuenta: con
 * el diámetro, el doble de recorridos se vería cuatro veces más grande.
 */
const BurbujasTipos = ({ tipos }) => {
  const conDatos = tipos.filter((t) => t.cuenta > 0).sort((a, b) => b.cuenta - a.cuenta);
  const maximo = conDatos[0]?.cuenta ?? 0;
  const porcentajes = porcentajesExactos(tipos.map((t) => t.cuenta));

  return (
    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
      {/* flex-1 solo en fila: en columna anularía la altura y las burbujas,
          que se colocan en absoluto, se saldrían del recuadro. */}
      <div className="relative h-56 w-full min-w-0 sm:flex-1" role="img"
        aria-label={tipos.map((t) => `${t.etiqueta}: ${t.cuenta}`).join(', ')}>
        {conDatos.map((tipo, i) => {
          const diametro = Math.max(DIAMETRO_MINIMO, DIAMETRO_MAXIMO * Math.sqrt(tipo.cuenta / maximo));
          const estilo = ESTILO[tipo.clave];
          return (
            <div
              key={tipo.clave}
              className="absolute -translate-x-1/2 -translate-y-1/2"
              style={{ ...POSICIONES[i], width: diametro, height: diametro }}
            >
              <div className={`flex h-full w-full items-center justify-center rounded-full ${estilo.burbuja}`}>
                <span className={`tabular font-bold tracking-tight ${diametro > 100 ? 'text-large-title' : 'text-title3'}`}>
                  {tipo.cuenta}
                </span>
              </div>
              <span className="absolute -left-2 top-1 flex items-center gap-1.5 whitespace-nowrap rounded-full bg-surface px-2 py-0.5 text-caption2 font-medium text-label shadow-level-1">
                <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${estilo.punto}`} />
                {tipo.etiqueta}
              </span>
            </div>
          );
        })}
      </div>

      <ul className="grid grid-cols-2 gap-2.5 sm:w-44 sm:grid-cols-1">
        {tipos.map((tipo, i) => (
          <li key={tipo.clave} className="rounded-control border border-separator/60 p-3">
            <p className="truncate text-caption text-label-secondary">{tipo.etiqueta}</p>
            <p className="tabular text-subhead font-semibold text-label">
              {tipo.cuenta} <span className="font-normal text-label-tertiary">({porcentajes[i]}%)</span>
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-fill/15">
              <div className={`h-full rounded-full ${ESTILO[tipo.clave].barra}`} style={{ width: `${porcentajes[i]}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BurbujasTipos;
