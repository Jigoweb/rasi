import Link from "next/link";
import { Button } from "@/shared/components/ui/button";

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen font-lora">
      {/* Hero Section */}
      <section className="relative w-full py-20 md:py-32 lg:py-48 overflow-hidden bg-anthropic-dark text-anthropic-light">
        <div className="absolute inset-0 bg-[url('https://www.reteartistispettacolo.it/wp-content/uploads/rasi_logo.png')] opacity-5 mix-blend-overlay bg-cover bg-center" />
        <div className="container mx-auto px-4 md:px-6 relative z-10">
          <div className="flex flex-col items-center text-center space-y-8 max-w-4xl mx-auto">
            <h1 className="font-poppins text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tighter leading-tight animate-in slide-in-from-bottom-8 fade-in duration-700">
              Il mandato <span className="text-anthropic-orange">più vantaggioso</span> per i tuoi diritti connessi.
            </h1>
            <p className="text-lg md:text-2xl text-anthropic-mid-gray max-w-2xl font-light leading-relaxed animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-150 fill-mode-both">
              Siamo l'Organismo di Gestione Collettiva scelto da migliaia di artisti. 
              Trasparenza, equità e una commissione ridotta solo sul percepito effettivo.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 pt-8 animate-in slide-in-from-bottom-8 fade-in duration-1000 delay-300 fill-mode-both">
              <Link href="/auth">
                <Button size="lg" className="w-full sm:w-auto font-poppins rounded-full bg-anthropic-orange text-anthropic-light hover:bg-anthropic-orange/90 text-lg px-8 h-14">
                  Iscriviti a R.A.S.I.
                </Button>
              </Link>
              <Link href="/chi-siamo">
                <Button size="lg" variant="outline" className="w-full sm:w-auto font-poppins rounded-full border-anthropic-mid-gray text-anthropic-light hover:bg-anthropic-light hover:text-anthropic-dark text-lg px-8 h-14">
                  Scopri i vantaggi
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="w-full py-16 md:py-24 bg-anthropic-light text-anthropic-dark border-b border-anthropic-light-gray">
        <div className="container mx-auto px-4 md:px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-anthropic-light-gray">
            <div className="flex flex-col space-y-2 py-6 md:py-0">
              <span className="font-poppins text-5xl md:text-6xl font-bold text-anthropic-blue tracking-tight">2.5k+</span>
              <span className="text-sm uppercase tracking-widest text-anthropic-mid-gray font-semibold">Artisti Mandanti</span>
            </div>
            <div className="flex flex-col space-y-2 py-6 md:py-0">
              <span className="font-poppins text-5xl md:text-6xl font-bold text-anthropic-green tracking-tight">41k+</span>
              <span className="text-sm uppercase tracking-widest text-anthropic-mid-gray font-semibold">Opere Interpretate</span>
            </div>
            <div className="flex flex-col space-y-2 py-6 md:py-0">
              <span className="font-poppins text-5xl md:text-6xl font-bold text-anthropic-orange tracking-tight">€490k</span>
              <span className="text-sm uppercase tracking-widest text-anthropic-mid-gray font-semibold">Diritti Gestiti</span>
            </div>
            <div className="flex flex-col space-y-2 py-6 md:py-0">
              <span className="font-poppins text-5xl md:text-6xl font-bold text-anthropic-dark tracking-tight">1.3k</span>
              <span className="text-sm uppercase tracking-widest text-anthropic-mid-gray font-semibold">Azioni a Tutela</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features / Why Us */}
      <section className="w-full py-20 md:py-32 bg-[#f4f2eb]">
        <div className="container mx-auto px-4 md:px-6">
          <div className="max-w-3xl mb-16">
            <h2 className="font-poppins text-3xl md:text-5xl font-bold text-anthropic-dark mb-6">
              Perché firmare il mandato alla R.A.S.I.?
            </h2>
            <p className="text-lg md:text-xl text-anthropic-dark/80 font-light">
              Offriamo condizioni trasparenti e servizi dedicati per massimizzare la valorizzazione del tuo lavoro.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            <div className="flex flex-col space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-anthropic-orange/10 flex items-center justify-center text-anthropic-orange font-bold text-xl">1</div>
              <h3 className="font-poppins text-2xl font-semibold text-anthropic-dark">Mandato Gratuito</h3>
              <p className="text-anthropic-dark/70 leading-relaxed">
                Il mandato è totalmente gratuito e può essere revocato in qualsiasi momento. Percepiremo solo una commissione del 10% sui compensi incassati.
              </p>
            </div>
            <div className="flex flex-col space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-anthropic-blue/10 flex items-center justify-center text-anthropic-blue font-bold text-xl">2</div>
              <h3 className="font-poppins text-2xl font-semibold text-anthropic-dark">Award System</h3>
              <p className="text-anthropic-dark/70 leading-relaxed">
                Un database informatico regolarmente aggiornato delle opere e dei titolari. Ti aiutiamo a ricostruire l'elenco delle tue interpretazioni.
              </p>
            </div>
            <div className="flex flex-col space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-anthropic-green/10 flex items-center justify-center text-anthropic-green font-bold text-xl">3</div>
              <h3 className="font-poppins text-2xl font-semibold text-anthropic-dark">Promozione Social</h3>
              <p className="text-anthropic-dark/70 leading-relaxed">
                Un servizio esclusivo e gratuito per sostenere la promozione delle tue opere e spettacoli sui principali canali social media.
              </p>
            </div>
          </div>
        </div>
      </section>
      
      {/* Testimonials */}
      <section className="w-full py-20 md:py-32 bg-anthropic-dark text-anthropic-light overflow-hidden">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row justify-between items-end mb-16">
            <h2 className="font-poppins text-3xl md:text-5xl font-bold max-w-2xl">
              Hanno già scelto R.A.S.I.
            </h2>
          </div>
          <div className="flex gap-6 overflow-x-auto pb-8 snap-x snap-mandatory hide-scrollbar">
            {["Giuppy Izzo", "Riccardo Mandolini", "Tony Sperandeo", "Ilaria Della Bidia", "Ugo Conti", "Eva Henger", "Valeria Marini"].map((artist, i) => (
              <div key={i} className="min-w-[280px] md:min-w-[350px] p-8 rounded-3xl bg-anthropic-light/5 border border-anthropic-light/10 snap-center">
                <p className="text-anthropic-mid-gray mb-8 italic">"Un team sempre disponibile nell'offrire informazione e supporto agli artisti, interpreti ed esecutori."</p>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-anthropic-orange/20 flex items-center justify-center font-poppins font-bold text-anthropic-orange">
                    {artist.charAt(0)}
                  </div>
                  <div>
                    <h4 className="font-poppins font-semibold">{artist}</h4>
                    <span className="text-sm text-anthropic-mid-gray">Artista Mandante</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}