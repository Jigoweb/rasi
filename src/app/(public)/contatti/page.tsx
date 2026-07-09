import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { Reveal } from "../reveal";
import { MapPin, Mail } from "lucide-react";

export default function ContattiPage() {
  return (
    <div className="font-schibsted">
      {/* Hero */}
      <section className="bg-rasi-ink py-16 md:py-24">
        <div className="mx-auto max-w-3xl px-4 text-center md:px-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl font-bold leading-[1.05] tracking-tight text-rasi-paper md:text-5xl">
            Scrivi a RASI
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-rasi-paper/70">
            Hai una domanda su come aderire, sui tuoi diritti o sui nostri servizi? Rispondiamo noi.
          </p>
        </div>
      </section>

      {/* Form + info */}
      <section className="mx-auto max-w-5xl px-4 py-16 md:px-6 md:py-24">
        <div className="grid grid-cols-1 gap-16 lg:grid-cols-[1fr_0.7fr]">
          <Reveal>
            <form className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="nome" className="text-rasi-ink">Nome e cognome</Label>
                <Input
                  id="nome"
                  name="nome"
                  autoComplete="name"
                  className="border-rasi-line focus-visible:border-rasi-ember focus-visible:ring-rasi-ember/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-rasi-ink">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  className="border-rasi-line focus-visible:border-rasi-ember focus-visible:ring-rasi-ember/30"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="messaggio" className="text-rasi-ink">Messaggio</Label>
                <Textarea
                  id="messaggio"
                  name="messaggio"
                  rows={6}
                  className="border-rasi-line focus-visible:border-rasi-ember focus-visible:ring-rasi-ember/30"
                />
              </div>
              <Button
                type="submit"
                className="rounded-full bg-rasi-ember px-8 py-6 text-base font-semibold text-rasi-paper hover:bg-rasi-ember-deep"
              >
                Invia messaggio
              </Button>
            </form>
          </Reveal>

          <Reveal delayMs={100}>
            <div className="space-y-8 rounded-md bg-rasi-paper p-8">
              <div className="flex gap-4">
                <MapPin className="h-5 w-5 shrink-0 text-rasi-ember" strokeWidth={1.75} />
                <div>
                  <h3 className="font-semibold text-rasi-ink">Sede</h3>
                  <p className="mt-1 text-sm text-rasi-slate">Via Po 43, 00198 Roma</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Mail className="h-5 w-5 shrink-0 text-rasi-ember" strokeWidth={1.75} />
                <div>
                  <h3 className="font-semibold text-rasi-ink">Email</h3>
                  <a
                    href="mailto:info@reteartistispettacolo.it"
                    className="mt-1 block text-sm text-rasi-slate hover:text-rasi-ember"
                  >
                    info@reteartistispettacolo.it
                  </a>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
