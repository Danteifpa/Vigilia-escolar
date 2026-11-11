const TZ = 'America/Belem';

export const formatarDataHora = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

export const formatarData = (iso: string) => {
  const s = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(iso));
  return s.charAt(0).toUpperCase() + s.slice(1);   // "Quarta-feira, 11 de novembro"
};
