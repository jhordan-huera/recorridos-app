/**
 * Paleta del gráfico por tema. Va en hexadecimal y no en variables CSS porque
 * Recharts escribe los colores como atributos SVG, y ahí var() no funciona.
 *
 * `fondo` es el color de la tarjeta: el trazo de ese color alrededor de cada
 * tramo es lo que abre el hueco entre los tramos apilados de una cápsula.
 */
export const PALETA_GRAFICO = {
  light: { recorridos: '#007AFF', riegos: '#0082A0', pista: '#7878801C', fondo: '#FFFFFF' },
  dark: { recorridos: '#0A84FF', riegos: '#40C8E0', pista: '#78788038', fondo: '#1C1C1E' },
};
