import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { FiLogOut, FiFileText } from "react-icons/fi";
import { HiOutlineCalendarDays } from "react-icons/hi2";

import { useAppContext } from "../context/authContext";
import { formatTopbarDate } from "../utils/dates";
import { clearTrackedApplication } from "../pages/applicant/trackedApplication";
import { client } from "@client";

/**
 * The applicant shell — `onboarding-rel8/New Applicant dashboard.png`.
 *
 * A cut-down version of `DashboardLayout`: a logo-only rail with a single "Application"
 * item, and a topbar carrying the organization, the date and Logout. No search, no
 * notifications, no member navigation — an applicant is not a member yet and none of it
 * would work for them.
 *
 * "Logout" is not a session logout: an applicant has no account. It clears the tracked
 * application and returns them to the tracking form, which is the only thing "log out"
 * can mean here.
 */
const ApplicantLayout = ({ children }: { children: ReactNode }) => {
  const navigate = useNavigate();
  const { organization } = useAppContext();

  const orgName = organization?.shortName || organization?.name || client.name;

  const exit = () => {
    clearTrackedApplication();
    navigate("/track", { replace: true });
  };

  return (
    <div className="font-sans h-screen overflow-hidden flex bg-white">
      {/* Rail */}
      <nav className="hidden lg:flex lg:w-[232px] flex-col flex-shrink-0 bg-app border-r border-hairline h-screen">
        <div className="px-6 py-6">
          {organization?.logo ? (
            <img src={organization.logo} alt={orgName} className="h-9 object-contain" />
          ) : (
            <span className="text-[20px] font-bold text-org-primary tracking-tight">{orgName}</span>
          )}
        </div>

        <div className="px-3">
          <span className="flex items-center gap-3 px-4 py-3 rounded-lg bg-org-tint text-org-primary font-medium border-l-4 border-org-primary">
            <FiFileText className="w-5 h-5" />
            Application
          </span>
        </div>
      </nav>

      <section className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="h-[70px] flex-shrink-0 border-b border-hairline bg-app">
          <div className="h-full flex items-center justify-between gap-4 px-4 lg:px-6">
            <div className="flex items-center gap-3 min-w-0">
              {organization?.logo ? (
                <img src={organization.logo} alt="" className="w-10 h-10 rounded-lg object-contain bg-white border border-hairline flex-shrink-0" />
              ) : (
                <span className="w-10 h-10 rounded-lg bg-org-tint text-org-primary grid place-items-center font-semibold flex-shrink-0">{String(orgName).charAt(0).toUpperCase()}</span>
              )}
              <div className="min-w-0 leading-tight">
                <p className="text-sm font-semibold text-ink truncate">{orgName}</p>
                <p className="text-xs text-muted">Applicant</p>
              </div>
            </div>

            <div className="hidden md:flex items-center gap-2">
              <HiOutlineCalendarDays className="w-5 h-5 text-org-primary" />
              <span className="text-sm text-ink whitespace-nowrap">{formatTopbarDate()}</span>
            </div>

            <button type="button" onClick={exit} className="inline-flex items-center gap-2 text-status-danger hover:opacity-80 flex-shrink-0">
              <FiLogOut className="w-5 h-5" />
              <span className="text-sm">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-hairline">
          <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6 lg:px-8 py-6 lg:py-8">{children}</div>
        </main>
      </section>
    </div>
  );
};

export default ApplicantLayout;
