import type { Metadata } from "next";
import ImportFromHash from "./ImportFromHash";

export const metadata: Metadata = { title: "Import LAMC Events" };

export default function ImportLamcEventsPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-4 text-2xl font-extrabold text-navy">Import LAMC events</h1>
      <ImportFromHash />
    </div>
  );
}
