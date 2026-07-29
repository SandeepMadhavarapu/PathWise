import { JobMoment } from "@/components/JobMoment";

// The back link that used to sit here is now rendered by the shell from the PARENT map in
// AppShell, so this route's way out cannot say something different from every other route's.
export default function MomentPage() {
  return (
    <>
      <JobMoment />

      <footer className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · Every consequence
        shows its derivation and the regulation behind it.
      </footer>
    </>
  );
}
