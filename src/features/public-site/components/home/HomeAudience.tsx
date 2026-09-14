export function HomeAudience() {
  return (
    <section className="w-full py-20 bg-[#f4f2eb]">
      <div className="container mx-auto px-4 md:px-6">
        <h2 className="font-poppins text-3xl md:text-4xl font-bold text-anthropic-dark mb-10 max-w-3xl">
          A chi si rivolge Rete Artisti Spettacolo per l&apos;Innovazione?
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-3xl bg-anthropic-light p-8 border border-anthropic-light-gray">
            <h3 className="font-poppins text-2xl font-semibold text-anthropic-dark mb-3">
              Sei un&apos;attrice, un attore o un doppiatore?
            </h3>
            <p className="text-anthropic-dark/70">
              R.A.S.I. amministra i diritti connessi sulle interpretazioni di opere cinematografiche
              e assimilate, negozia con gli utilizzatori e liquida i compensi.
            </p>
          </div>
          <div className="rounded-3xl bg-anthropic-light p-8 border border-anthropic-light-gray">
            <h3 className="font-poppins text-2xl font-semibold text-anthropic-dark mb-3">
              Sei un cantante, musicista, orchestrale o esecutore?
            </h3>
            <p className="text-anthropic-dark/70">
              Il mandato copre anche coristi, direttori e strumentisti, anche se parte di un gruppo.
              Ricostruiamo il repertorio e verifichiamo gli utilizzi.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
