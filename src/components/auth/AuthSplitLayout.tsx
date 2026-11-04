import { ReactNode } from "react";
import { HiOutlineCalendarDays } from "react-icons/hi2";

import { useAppContext } from "../../context/authContext";
import illustration from "../../assets/images/auth-connecting-people.png";
import { client } from "@client";

interface Props {
  title: string;
  subtitle?: string;
  children: ReactNode;
  /** The "or" rules either side of the subtitle, as the mockup draws them. */
  showRule?: boolean;
}

/**
 * The auth split screen — `login screen members/member's login page.png`.
 *
 * Illustration on the left behind a hairline divider, form on the right. Shared by every
 * auth screen so login, registration, verification and password recovery cannot drift
 * apart the way the four bespoke layouts they replace had.
 *
 * The illustration is a fixed brand asset, not a tenant upload — it is decorative, so it is
 * hidden below `lg` rather than shrunk into uselessness on a phone.
 */
const AuthSplitLayout = ({ title, subtitle, children, showRule = true }: Props) => {
  const { organization } = useAppContext();

  return (
    <main className="min-h-screen w-full bg-white grid grid-cols-1 lg:grid-cols-2">
      {client.authImage ? (
        <div className="hidden lg:block relative bg-black overflow-hidden">
          <img src={client.authImage} alt={client.name} className="absolute inset-0 w-full h-full object-cover object-top" />
          <div className="absolute inset-x-0 bottom-0 p-12 bg-gradient-to-t from-black/90 to-transparent">
            <p className="text-3xl font-bold text-white">{client.name}</p>
            {client.tagline && <p className="text-lg text-white/80 mt-2">{client.tagline}</p>}
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex items-center justify-center border-r border-hairline p-12">
          <img src={illustration} alt="" className="w-full max-w-lg object-contain" />
        </div>
      )}

      <div className="flex items-center justify-center px-5 sm:px-10 py-12">
        <div className="w-full max-w-md">
          <div className="flex justify-center mb-6">
            {organization?.logo || client.logo ? (
              <img src={organization?.logo || client.logo} alt={organization?.name ?? ""} className="w-24 h-24 rounded-full object-contain bg-org-tint/60 p-3" />
            ) : (
              <span className="w-24 h-24 rounded-full bg-org-tint grid place-items-center">
                <HiOutlineCalendarDays className="w-10 h-10 text-org-primary" />
              </span>
            )}
          </div>

          <h1 className="text-[34px] leading-tight font-bold text-ink text-center">{title}</h1>
          {subtitle && <p className="text-[15px] text-muted text-center mt-2">{subtitle}</p>}

          {showRule && (
            <div className="flex items-center gap-6 my-7" aria-hidden>
              <span className="flex-1 h-px bg-hairline" />
              <span className="flex-1 h-px bg-hairline" />
            </div>
          )}

          {children}
        </div>
      </div>
    </main>
  );
};

export default AuthSplitLayout;
