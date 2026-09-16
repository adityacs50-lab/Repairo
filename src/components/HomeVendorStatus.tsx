import Link from "next/link";
import { VENDOR_SPEC_STATUS } from "@/lib/vendor-status";

export function HomeVendorStatus() {
  return (
    <div className="home-vendor-status" aria-label="Vendor spec pins">
      <p className="mono-label">Live spec pins (catalog)</p>
      <div className="home-vendor-status-scroll">
        <table className="home-vendor-status-table">
          <thead>
            <tr>
              <th scope="col">Vendor</th>
              <th scope="col">Pin</th>
              <th scope="col">Consumers</th>
              <th scope="col">Watch</th>
            </tr>
          </thead>
          <tbody>
            {VENDOR_SPEC_STATUS.map((row) => (
              <tr key={row.vendor}>
                <td>{row.vendor}</td>
                <td>{row.specPin}</td>
                <td>{row.languages}</td>
                <td>
                  <span
                    className={
                      row.watch === "active" ? "home-vendor-pill home-vendor-pill--live" : "home-vendor-pill"
                    }
                  >
                    {row.watch === "active" ? "• active" : "catalog"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Link className="text-link home-vendor-status-link" href="/agents">
        Install a vendor agent <span className="arrow-mark" aria-hidden="true">↗</span>
      </Link>
    </div>
  );
}
