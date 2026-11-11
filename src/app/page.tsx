import { redirect } from 'next/navigation';

// O middleware direciona cada perfil para a sua área; isto é só a rede de segurança.
export default function Inicio() {
  redirect('/entrar');
}
