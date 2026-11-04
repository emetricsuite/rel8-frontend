import { FiHome, FiUsers, FiCalendar, FiBookOpen, FiImage, FiBarChart2, FiBriefcase, FiHeadphones, FiLogOut, FiBell } from "react-icons/fi";
import { PiHandCoins } from "react-icons/pi";
import { HiOutlineNewspaper, HiOutlineIdentification } from "react-icons/hi2";
import { IoWalletOutline } from "react-icons/io5";
import { MdOutlineCalendarMonth } from "react-icons/md";
import { SideBarLinkType } from "../types/sidebarDataType";
import { ENVS } from "../clients/labels";

/**
 * The rail, in the order every mockup draws it. See REDESIGN.md §4.
 *
 * `Chat` is deliberately absent. The mockups draw a standalone Chat page, but chat is a
 * property of an Environment on this backend (`Environment.hasChat`, and a socket protocol
 * keyed on `environmentId`), so it lives inside the Environment detail page instead of as
 * a second, parallel place to have the same conversations. Decided with the user, M13.
 *
 * Two rules worth keeping:
 *  - every entry gets a distinct icon (the pre-redesign rail reused FiUser four times);
 *  - `key` is what Sidebar.tsx looks up to hang a count badge or unread dot on an item,
 *    so renaming an entry does not silently drop its badge.
 */
export const sideBarData: SideBarLinkType[] = [
  {
    key: "home",
    mainIcon: FiHome,
    name: "Home",
    path: "/",
  },
  {
    key: "notifications",
    mainIcon: FiBell,
    name: "Notifications",
    path: "/notifications",
  },
  {
    key: "environment",
    mainIcon: FiUsers,
    name: ENVS,
    // One tabbed page: members, excos, committees, groups, member types. The rail used to
    // expand into those as a submenu; the backend has since collapsed them into one
    // `Environment` resource (REDESIGN.md §0c).
    path: "/environment",
    activeFor: ["/members", "/member-types"],
  },

  {
    key: "events",
    mainIcon: FiCalendar,
    name: "Events",
    path: "/events",
    activeFor: ["/event"],
    startsGroup: true,
  },
  {
    key: "meetings",
    mainIcon: MdOutlineCalendarMonth,
    name: "Meetings",
    path: "/meeting",
  },
  {
    key: "publications",
    mainIcon: FiBookOpen,
    name: "Publications",
    path: "/publications",
    activeFor: ["/publication"],
  },
  {
    key: "news",
    mainIcon: HiOutlineNewspaper,
    name: "News",
    path: "/news",
  },
  {
    key: "gallery",
    mainIcon: FiImage,
    name: "Gallery",
    path: "/gallery",
  },
  {
    key: "elections",
    mainIcon: FiBarChart2,
    name: "Elections",
    path: "/election",
    
  },
  {
    key: "dues",
    mainIcon: IoWalletOutline,
    name: "Dues",
    path: "/dues",
  },
  {
    key: "account",
    mainIcon: HiOutlineIdentification,
    name: "My Account",
    path: "/account",
  },
  {
    key: "projects",
    mainIcon: PiHandCoins,
    name: "Fund a Project",
    path: "/fund-a-project",
    activeFor: ["/support-in-kind", "/support-in-cash"],
  },
  {
    key: "services",
    mainIcon: FiBriefcase,
    name: "Service Request",
    path: "/service-requests",
    activeFor: ["/service-requests-submission", "/services"],
  },
  {
    key: "support",
    mainIcon: FiHeadphones,
    name: "Support",
    path: "/support",
    
  },
  {
    key: "logout",
    mainIcon: FiLogOut,
    name: "Logout",
    path: "/logout",
    danger: true,
    startsGroup: true,
  },
];
