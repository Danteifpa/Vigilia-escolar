export default function Offline() {
  return (
    <main className="mx-auto max-w-md p-6 text-center">
      <h1 className="text-xl font-bold">Sem conexão</h1>
      <p className="mt-2 text-slate-600">
        Esta página não está disponível offline. O painel da escola e o registro de ocorrências
        continuam funcionando — os envios serão feitos assim que a internet voltar.
      </p>
      <a href="/escola" className="mt-4 inline-block rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">Ir para o painel</a>
    </main>
  );
}
