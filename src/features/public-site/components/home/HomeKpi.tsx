import { HOME_KPI } from "../../site-info";

export function HomeKpi() {
  const items = [HOME_KPI.artisti, HOME_KPI.opere, HOME_KPI.diritti, HOME_KPI.azioni];
  return (
    <section className="w-full py-16 bg-anthropic-dark text-anthropic-light">
      <div className="container mx-auto px-4 md:px-6">
        <p className="font-poppins text-xs uppercase tracking-widest text-anthropic-mid-gray mb-8">
          Qualche numero dal database Award System
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 text-center">
          {items.map((item) => (
            <div key={item.label}>
              <div className="font-poppins text-4xl md:text-5xl font-bold text-anthropic-orange mb-2">
                {item.value}
              </div>
              <div className="text-sm uppercase tracking-wide text-anthropic-mid-gray">{item.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
