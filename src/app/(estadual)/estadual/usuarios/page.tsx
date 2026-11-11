import type { Metadata } from 'next';
import { GestaoUsuarios } from '@/components/usuarios/GestaoUsuarios';

export const metadata: Metadata = { title: 'Usuários · Vigília Escolar PA' };

export default function PaginaUsuarios() {
  return <GestaoUsuarios />;
}
