import Link from "next/link";

/**
 * The 404, in the product's own voice.
 *
 * Not a redesign and not a feature — it replaces Next's stock "404: This page could not be found",
 * which is an unstyled black-on-white system page with no way back. On a submission where a judge
 * may well mistype a URL, that page is the one screen in the product that looks like it belongs to
 * something else.
 *
 * It renders inside AppShell like every other route, so the nav, the skip link and the build stamp
 * are all still there — which means the way back is the same way back the rest of the app offers,
 * rather than a link invented for this page.
 *
 * The wording is deliberately the same move the engines make: say what is not known, do not guess.
 * A 404 here is PathWise failing to find a page, and it says so in those terms rather than
 * apologising or inventing a reason.
 */
export default function NotFound() {
  return (
    <>
      {/* No <h1> here. AppShell renders the page heading for every route, and this page is inside
          it — a heading of our own made the 404 the only screen in the product with two h1s.
          The shell's fallback title now carries this page's heading instead. */}
      <p className="check-lede">
        PathWise could not find a page here. That is all it knows — the address may be mistyped, or
        it may be one that never existed. Nothing is wrong with your record, and nothing has been
        lost: PathWise stores nothing between visits.
      </p>

      <p className="field-note">Three places worth starting from:</p>
      <ul className="unknowns">
        <li className="unknown-item">
          <div className="unknown-what">
            <Link href="/check">Check your own status</Link>
          </div>
          <div className="unknown-why">
            Your immigration status and state, run through the same engines — in this tab, stored
            nowhere.
          </div>
        </li>
        <li className="unknown-item">
          <div className="unknown-what">
            <Link href="/student">See the worked example</Link>
          </div>
          <div className="unknown-why">
            One student&apos;s record read by three offices at once, with every finding cited.
          </div>
        </li>
        <li className="unknown-item">
          <div className="unknown-what">
            <Link href="/coverage">Read the coverage and the rule packs</Link>
          </div>
          <div className="unknown-why">
            Which jurisdictions PathWise has modelled, which it has only sourced, and the rule files
            themselves.
          </div>
        </li>
      </ul>

      <footer className="foot">
        <span className="privacy">No account. Nothing stored on a server.</span> · PathWise advises;
        the office decides.
      </footer>
    </>
  );
}
