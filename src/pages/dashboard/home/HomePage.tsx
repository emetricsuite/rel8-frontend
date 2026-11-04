import { ElementType, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import { FiChevronRight, FiCalendar, FiBookOpen, FiImage, FiBriefcase } from "react-icons/fi";
import { HiOutlineArrowPath } from "react-icons/hi2";
import { IoWalletOutline } from "react-icons/io5";
import { MdOutlineCalendarMonth } from "react-icons/md";
import { PiHandCoins } from "react-icons/pi";

import { fetchAllNotifications } from "../../../api/notifications/notifications-api";
import { fetchAllUserNews } from "../../../api/news/news-api";
import { fetchAllUserEvents } from "../../../api/events/events-api";
import { fetchUserPublications } from "../../../api/publications/publications-api";
import { fetchUserMeetings } from "../../../api/meetings/api-meetings";
import { fetchUserDues } from "../../../api/account/account-api";
import { isOutstanding } from "../../../api/paystack-api";
import { client } from "@client";

import { Button, Card, EmptyState, PageHeader, StatCard, StatCardRow } from "../../../components/ui";
import CircleLoader from "../../../components/loaders/CircleLoader";
import NotificationRow from "../../../components/notifications/NotificationRow";
import ApplicationFeeGate from "../../../components/payments/ApplicationFeeGate";
import { NotificationDataType, TableDataType } from "../../../types/myTypes";
import { formatMoney, useCurrencySymbol } from "../../../utils/currency";
import { formatDate } from "../../../utils/dates";
import emptyMailbox from "../../../assets/images/no-notification-available.png";
import { htmlToText } from "../../../utils/html";

/** Every list endpoint here answers either a bare array or a `{ results }` / `{ data }` envelope. */
const asArray = <T,>(value: any): T[] => (Array.isArray(value) ? value : Array.isArray(value?.results) ? value.results : Array.isArray(value?.data) ? value.data : []);

/* ------------------------------------------------------------------ Quick Actions -- */

const QUICK_ACTIONS: { label: string; path: string; icon: ElementType; badgeKey?: "events" }[] = [
  { label: "Publications", path: "/publications", icon: FiBookOpen },
  { label: "Events", path: "/events", icon: FiCalendar, badgeKey: "events" },
  { label: "Meetings", path: "/meeting", icon: MdOutlineCalendarMonth },
  { label: "Gallery", path: "/gallery", icon: FiImage },
  { label: "Fund a Project", path: "/fund-a-project", icon: PiHandCoins },
  { label: "Service Request", path: "/service-requests", icon: FiBriefcase },
];

const QuickActionRow = ({ label, path, icon: Icon, badge }: { label: string; path: string; icon: ElementType; badge?: number }) => (
  <Link to={path} className="flex items-center gap-3 rounded-lg border border-hairline px-4 py-3 hover:border-org-primary/40 hover:bg-org-tint/40 transition-colors">
    <Icon className="w-5 h-5 text-org-primary flex-shrink-0" />
    <span className="flex-1 min-w-0 truncate text-[15px] text-ink">{label}</span>
    {!!badge && <span className="flex-shrink-0 text-[11px] font-medium text-white bg-org-primary rounded-full px-2 py-0.5">{badge}</span>}
    <FiChevronRight className="w-4 h-4 text-muted flex-shrink-0" />
  </Link>
);

/* -------------------------------------------------------------------------- Page -- */

const HomePage = () => {
  const navigate = useNavigate();
  const currencySymbol = useCurrencySymbol();

  const notifications = useQuery("notifications", fetchAllNotifications, { retry: 1, staleTime: 5 * 60 * 1000 });
  const news = useQuery("news", fetchAllUserNews, { retry: 1, retryDelay: 3000 });
  const events = useQuery("events", fetchAllUserEvents, { retry: 1, retryDelay: 3000, staleTime: 5 * 60 * 1000 });
  const publications = useQuery("publications", fetchUserPublications, { retry: 1, retryDelay: 3000 });
  const meetings = useQuery("meetings", fetchUserMeetings, { retry: 1, retryDelay: 3000 });
  const dues = useQuery("userDues", fetchUserDues, { retry: 1 });

  const newsList = useMemo(() => asArray<any>(news.data), [news.data]);
  const eventList = useMemo(() => asArray<any>(events.data), [events.data]);
  const meetingList = useMemo(() => asArray<any>(meetings.data), [meetings.data]);
  const publicationList = useMemo(() => asArray<any>(publications.data), [publications.data]);
  const notificationList = useMemo(() => asArray<NotificationDataType>(notifications.data), [notifications.data]);

  // Same rule the dues blocker uses: anything not settled is still owed.
  const outstanding = useMemo(
    () =>
      asArray<TableDataType>(dues.data)
        .filter(d => isOutstanding(d.status))
        .reduce((total, d) => total + (parseFloat(d.amount || "0") || 0), 0),
    [dues.data]
  );

  const latest = newsList[0];

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Here is what's happening with your community today." />

      {client.homeImage && (
        <section className="relative overflow-hidden rounded-2xl bg-black mb-6 h-[200px] flex items-center">
          <img src={client.homeImage} alt="" className="absolute right-0 inset-y-0 h-full w-[150px] sm:w-[260px] object-cover object-[center_12%]" />
          <div className="relative p-6 sm:p-8 pr-[160px] sm:pr-[280px]">
            <p className="text-xl sm:text-3xl font-bold text-white">{client.name}</p>
            {client.tagline && <p className="text-sm sm:text-lg mt-2" style={{ color: client.secondary ?? undefined }}>{client.tagline}</p>}
          </div>
        </section>
      )}

      {/* Renders nothing unless this member joined by applying and still owes the fee. */}
      <ApplicationFeeGate />

      <StatCardRow>
        <StatCard title="Active Dues" value={dues.isLoading ? "..." : formatMoney(outstanding, currencySymbol)} icon={IoWalletOutline} to="/dues" />
        <StatCard title="Total Events" value={events.isLoading ? "..." : eventList.length} icon={FiCalendar} to="/events" />
        <StatCard title="Meeting" value={meetings.isLoading ? "..." : meetingList.length} icon={MdOutlineCalendarMonth} to="/meeting" />
      </StatCardRow>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* --------------------------------------------------------------- left column */}
        <div className="xl:col-span-2 flex flex-col gap-6 min-w-0">
          <Card className="p-6">
            <h3 className="text-[18px] font-semibold text-ink">Latest Update</h3>

            {news.isLoading ? (
              <div className="py-10 grid place-items-center">
                <CircleLoader />
              </div>
            ) : latest ? (
              <div className="mt-4 flex flex-col sm:flex-row gap-5">
                {latest.bannerUrl && <img src={latest.bannerUrl} alt="" className="w-full sm:w-56 h-40 object-cover rounded-lg flex-shrink-0" />}
                <div className="min-w-0 flex flex-col">
                  <p className="text-xs text-muted">{formatDate(latest.created_at || latest.createdAt)}</p>
                  <h4 className="text-[17px] font-semibold text-ink mt-1 line-clamp-2">{latest.name || latest.title}</h4>
                  <p className="text-sm text-muted mt-2 line-clamp-3">{htmlToText(latest.content || latest.body || "")}</p>
                  <div className="mt-4">
                    <Button onClick={() => navigate(`/news/${latest.id ?? latest._id}/`)}>Read more</Button>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                layout="row"
                image={emptyMailbox}
                title="No Update Yet"
                description="You will see the latest news and announcements here when available"
                action={
                  <Button icon={HiOutlineArrowPath} isLoading={news.isFetching} onClick={() => news.refetch()}>
                    Check for Update
                  </Button>
                }
              />
            )}
          </Card>

          <Card className="p-6">
            <h3 className="text-[18px] font-semibold text-ink mb-4">Recent Notifications</h3>

            {notifications.isLoading ? (
              <div className="py-10 grid place-items-center">
                <CircleLoader />
              </div>
            ) : notificationList.length === 0 ? (
              <EmptyState title="Nothing new" description="No notifications yet. Enjoy the silence." />
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {notificationList.slice(0, 4).map((item, index) => (
                    <NotificationRow key={item._id ?? index} item={item} />
                  ))}
                </div>
                <Link to="/notifications" className="mt-5 flex items-center justify-center gap-1 text-sm font-medium text-org-primary">
                  View all notifications <FiChevronRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </Card>
        </div>

        {/* -------------------------------------------------------------- right column */}
        <div className="flex flex-col gap-6 min-w-0">
          <Card className="p-6">
            <h3 className="text-[18px] font-semibold text-ink mb-4">Quick Actions</h3>
            <div className="flex flex-col gap-3">
              {QUICK_ACTIONS.map(action => (
                <QuickActionRow key={action.path} label={action.label} path={action.path} icon={action.icon} badge={action.badgeKey === "events" ? eventList.length : undefined} />
              ))}
            </div>
          </Card>

          <Card className="p-6">
            <h3 className="text-[18px] font-semibold text-ink mb-4">Publications</h3>

            {publications.isLoading ? (
              <div className="py-10 grid place-items-center">
                <CircleLoader />
              </div>
            ) : publicationList.length === 0 ? (
              <EmptyState icon={FiBookOpen} title="Nothing published yet" description="Publications shared with you will appear here." />
            ) : (
              <>
                <div className="flex flex-col gap-3">
                  {publicationList.slice(0, 4).map((item: any, index: number) => (
                    <Link
                      key={item.id ?? item._id ?? index}
                      to={`/publication/${item.id ?? item._id}/`}
                      className="flex items-start gap-3 rounded-lg border border-hairline px-4 py-3 hover:border-org-primary/40 hover:bg-org-tint/40 transition-colors"
                    >
                      <FiBookOpen className="w-5 h-5 text-org-primary flex-shrink-0 mt-0.5" />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-ink line-clamp-2">{item.name || item.title}</span>
                        <span className="block text-xs text-muted mt-0.5">{formatDate(item.created_at || item.createdAt)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
                <Link to="/publications" className="mt-5 flex items-center justify-center gap-1 text-sm font-medium text-org-primary">
                  View all publications <FiChevronRight className="w-4 h-4" />
                </Link>
              </>
            )}
          </Card>
        </div>
      </div>
    </>
  );
};

export default HomePage;
