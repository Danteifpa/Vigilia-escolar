/** Mensagens do Supabase Auth traduzidas para o usuário final. */
const POR_CODIGO: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail pelo link do convite antes de entrar.',
  user_banned: 'Acesso bloqueado. Procure a DRE ou a SEDUC.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos.',
  over_email_send_rate_limit: 'Muitos e-mails enviados. Aguarde alguns minutos.',
  weak_password: 'Senha fraca. Use ao menos 10 caracteres, misturando letras e números.',
  same_password: 'A nova senha precisa ser diferente da atual.',
  otp_expired: 'O link expirou. Peça um novo.',
  session_not_found: 'Sessão expirada. Entre novamente.',
};

export const traduzirErroAuth = (e: { code?: string; message?: string } | null | undefined) =>
  (e?.code && POR_CODIGO[e.code]) || 'Não foi possível concluir. Verifique a conexão e tente novamente.';

export const ERROS_DE_ENTRADA: Record<string, string> = {
  sem_perfil: 'Sua conta não tem um perfil ativo no sistema. Procure a DRE ou a SEDUC.',
  link_invalido: 'O link de acesso é inválido ou expirou. Peça um novo.',
};
