import PageHeader from "@/components/PageHeader";
import SponsorApplyForm from "./SponsorApplyForm";

export default function SponsorApplyPage() {
  return (
    <div>
      <PageHeader
        title="Become a Sponsor"
        subtitle="Tell us a bit about your organization and we'll follow up."
      />
      <div className="mx-auto max-w-2xl px-4 py-12">
        <SponsorApplyForm />
      </div>
    </div>
  );
}
