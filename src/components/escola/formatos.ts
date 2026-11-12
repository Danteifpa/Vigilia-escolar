const TZ = 'America/Belem';

export const formatarDataHora = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export const formatarData = (iso: string) => {
  const s = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);   // "Quarta-feira, 11 de novembro"
};

/** "há 3 h", "há 2 dias" — tempo de espera na fila */
export function haQuantoTempo(iso: string, agora = Date.now()) {
  const min = Math.max(0, Math.round((agora - Date.parse(iso)) / 60_000));
  if (min < 1) return 'agora';
  if (min < 60) return `há ${min} min`;
  const h = Math.round(min / 60);
  if (h < 48) return `há ${h} h`;
  return `há ${Math.round(h / 24)} dias`;
}
