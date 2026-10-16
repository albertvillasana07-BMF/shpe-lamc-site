import ShpeText from "@/components/ShpeText";
import DisciplineBar from "@/components/DisciplineBar";

export default function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="on-dark text-white">
      <div className="blueprint">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <p className="mb-2 text-sm font-semibold tracking-wide text-orange-bright">
            <span className="font-shpe">SHPE</span> LAMC
          </p>
          <h1 className="text-3xl font-extrabold md:text-4xl">
            <ShpeText>{title}</ShpeText>
          </h1>
          {subtitle && <p className="mt-2 max-w-2xl text-[#dbe3f2]">{subtitle}</p>}
        </div>
      </div>
      <DisciplineBar />
    </section>
  );
}
