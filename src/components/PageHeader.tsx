import ShpeText from "@/components/ShpeText";

export default function PageHeader({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <section className="gradient-header text-white">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <h1 className="text-3xl font-extrabold md:text-4xl">
          <ShpeText>{title}</ShpeText>
        </h1>
        {subtitle && <p className="mt-2 max-w-2xl text-white">{subtitle}</p>}
      </div>
      <div className="stripe-bar h-1.5 w-full" aria-hidden="true" />
    </section>
  );
}
