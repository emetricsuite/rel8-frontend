import { useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQuery } from "react-query";
import { FiUsers, FiCalendar, FiBookOpen, FiImage, FiMessageCircle } from "react-icons/fi";
import { MdOutlineCalendarMonth } from "react-icons/md";
import { HiOutlineNewspaper } from "react-icons/hi2";

import { fetchEnvironment, fetchEnvironmentMembers } from "../../../api/environments/environments-api";
import { fetchAllUserNews } from "../../../api/news/news-api";
import { fetchUserPublications } from "../../../api/publications/publications-api";
import { fetchAllGalleryData } from "../../../api/gallery/gallery-api";
import { fetchAllUserEvents } from "../../../api/events/events-api";
import { fetchUserMeetings } from "../../../api/meetings/api-meetings";

import { BackLink, Button, Card, EmptyState, KeyValueList, MediaCardGrid, PageHeader, PersonCard, PersonCardGrid, Tabs, TabItem } from "../../../components/ui";
import MediaCard from "../../../components/ui/MediaCard";
import EnvironmentChatTab from "./EnvironmentChatTab";
import CircleLoader from "../../../components/loaders/CircleLoader";
import { formatCardDateTime, formatDate, isPast } from "../../../utils/dates";
import { eventTitle } from "../events/eventFields";
import { ENV } from "../../../clients/labels";

type TabKey = "info" | "members" | "news" | "publications" | "gallery" | "events" | "meetings" | "chat";

const TYPE_LABEL: Record<string, string> = {
  exco: "Exco",
  committee: "Committee",
  general: "Group",
};

/**
 * Content is scoped to an environment by **`environmentId`**.
 *
 * The page this replaced filtered on `item.groupId === id`, a field that does not exist on
 * News, Publication, Gallery, Event or Meeting — every one of those models carries
 * `environmentId` (each with a literal `// Changed from groupId` comment in the schema).
 * So every content tab rendered empty no matter what was in the environment.
 */
const belongsToEnvironment = (item: any, id?: string) => !!id && String(item?.environmentId?._id ?? item?.environmentId ?? "") === String(id);

const EnvironmentDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  // `/environment/:id?tab=chat&member=<id>` is how "Chat Up" opens a conversation.
  const [tab, setTab] = useState<TabKey>((params.get("tab") as TabKey) || "info");
  const chatWithMemberId = params.get("member");

  const { data: environment, isLoading, isError } = useQuery(["environment", id], () => fetchEnvironment(id as string), { enabled: !!id });
  const { data: members, isLoading: membersLoading } = useQuery(["environmentMembers", id], () => fetchEnvironmentMembers(id as string), { enabled: !!id && tab === "members" });

  const { data: newsData } = useQuery("news", fetchAllUserNews);
  const { data: publicationsData } = useQuery("publications", fetchUserPublications);
  const { data: galleryData } = useQuery(["galleryData", 1], () => fetchAllGalleryData(1));
  const { data: eventsData } = useQuery("events", fetchAllUserEvents);
  const { data: meetingsData } = useQuery("meetings", fetchUserMeetings);

  const scoped = useMemo(() => {
    const pick = (data: any) => (Array.isArray(data) ? data.filter((item: any) => belongsToEnvironment(item, id)) : []);
    return {
      news: pick(newsData),
      publications: pick(publicationsData),
      gallery: pick(galleryData),
      events: pick(eventsData),
      meetings: pick(meetingsData),
    };
  }, [newsData, publicationsData, galleryData, eventsData, meetingsData, id]);

  const tabs: TabItem[] = useMemo(() => {
    const base: TabItem[] = [
      { key: "info", label: "Info" },
      { key: "members", label: "Members" },
      { key: "news", label: "News", count: scoped.news.length || undefined },
      { key: "publications", label: "Publications", count: scoped.publications.length || undefined },
      { key: "gallery", label: "Gallery", count: scoped.gallery.length || undefined },
      { key: "events", label: "Events", count: scoped.events.length || undefined },
      { key: "meetings", label: "Meetings", count: scoped.meetings.length || undefined },
    ];
    // The server refuses `joinEnvironment` unless `hasChat` is set, so do not offer the tab.
    if (environment?.hasChat) base.push({ key: "chat", label: "Chat" });
    return base;
  }, [scoped, environment]);

  if (isLoading) {
    return (
      <div className="py-20 grid place-items-center">
        <CircleLoader />
      </div>
    );
  }

  if (isError || !environment) {
    return (
      <>
        <BackLink to="/environment" label="Back to environment" />
        <PageHeader title={ENV} />
        <EmptyState icon={FiUsers} title={`${ENV} not found`} description="It may have been removed." action={<Button onClick={() => navigate("/environment")}>Back to environment</Button>} />
      </>
    );
  }

  const positions = (environment.positions ?? []).slice().sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <>
      <BackLink to="/environment" label="Back to environment" />
      <PageHeader title={environment.name} subtitle={environment.description || `${TYPE_LABEL[environment.environmentType] ?? `${ENV}`} details and activity`} />

      <Tabs tabs={tabs} active={tab} onChange={key => setTab(key as TabKey)} />

      {tab === "info" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          <Card className="p-6" accent>
            <KeyValueList
              entries={[
                { label: "Name", value: environment.name },
                { label: "Type", value: TYPE_LABEL[environment.environmentType] ?? environment.environmentType },
                { label: "Description", value: environment.description || "Not provided" },
                { label: "Chat", value: environment.hasChat ? "Enabled" : "Disabled" },
                ...(environment.startDate ? [{ label: "Start date", value: formatDate(environment.startDate) }] : []),
                ...(environment.endDate ? [{ label: "End date", value: formatDate(environment.endDate) }] : []),
              ]}
            />
          </Card>

          <div>
            <h3 className="text-[18px] font-semibold text-ink mb-4">Positions</h3>
            {positions.length === 0 ? (
              <EmptyState icon={FiUsers} title="No positions listed" description="This environment has no titled seats." />
            ) : (
              <div className="flex flex-col gap-3">
                {positions.map(position => (
                  <Card key={position._id} className="p-4 flex items-center gap-4">
                    {position.imageUrl ? (
                      <img src={position.imageUrl} alt="" className="w-12 h-12 rounded-full object-cover flex-shrink-0" />
                    ) : (
                      <span className="w-12 h-12 rounded-full bg-org-tint grid place-items-center flex-shrink-0">
                        <FiUsers className="w-5 h-5 text-org-primary/60" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="text-[15px] font-medium text-org-primary truncate">{position.name}</p>
                      <p className="text-sm text-muted truncate">{position.title}</p>
                      {position.email && <p className="text-sm text-muted truncate">{position.email}</p>}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "members" &&
        (membersLoading ? (
          <div className="py-20 grid place-items-center">
            <CircleLoader />
          </div>
        ) : !members || members.length === 0 ? (
          <EmptyState icon={FiUsers} title="No members" description="Nobody has been added to this environment yet." />
        ) : (
          <>
            <p className="text-[15px] text-ink mb-4">
              {members.length} Member{members.length === 1 ? "" : "s"}
            </p>
            <PersonCardGrid>
              {members.map(member => (
                <PersonCard
                  key={member._id}
                  name={member.name}
                  email={member.email}
                  imageUrl={member.imageUrl}
                  onClick={() => navigate(`/members/${member._id}`)}
                  actions={
                    environment.hasChat ? (
                      <Button
                        size="sm"
                        icon={FiMessageCircle}
                        onClick={event => {
                          event.stopPropagation();
                          setTab("chat");
                          navigate(`/environment/${id}?tab=chat&member=${member._id}`, { replace: true });
                        }}
                      >
                        Chat Up
                      </Button>
                    ) : undefined
                  }
                />
              ))}
            </PersonCardGrid>
          </>
        ))}

      {tab === "news" &&
        (scoped.news.length === 0 ? (
          <EmptyState icon={HiOutlineNewspaper} title="No news" description="Nothing has been posted to this environment." />
        ) : (
          <MediaCardGrid>
            {scoped.news.map((item: any) => (
              <MediaCard key={item._id ?? item.id} image={item.bannerUrl} title={item.name || item.title} meta={formatDate(item.createdAt || item.created_at)} excerpt={item.body} onClick={() => navigate(`/news/${item._id ?? item.id}/`)} />
            ))}
          </MediaCardGrid>
        ))}

      {tab === "publications" &&
        (scoped.publications.length === 0 ? (
          <EmptyState icon={FiBookOpen} title="No publications" description="Nothing has been published to this environment." />
        ) : (
          <MediaCardGrid>
            {scoped.publications.map((item: any) => (
              <MediaCard key={item._id ?? item.id} image={item.bannerUrl} title={item.name || item.title} meta={formatDate(item.createdAt || item.created_at)} excerpt={item.body} onClick={() => navigate(`/publication/${item._id ?? item.id}/`)} />
            ))}
          </MediaCardGrid>
        ))}

      {tab === "gallery" &&
        (scoped.gallery.length === 0 ? (
          <EmptyState icon={FiImage} title="No gallery items" description="No photos have been shared with this environment." />
        ) : (
          <MediaCardGrid>
            {scoped.gallery.map((item: any) => (
              <MediaCard key={item._id ?? item.id} image={item.bannerUrl || item.imageUrl} title={item.name || item.title} meta={formatDate(item.createdAt)} onClick={() => navigate(`/gallery/${item._id ?? item.id}`)} />
            ))}
          </MediaCardGrid>
        ))}

      {tab === "events" &&
        (scoped.events.length === 0 ? (
          <EmptyState icon={FiCalendar} title="No events" description="This environment has no events scheduled." />
        ) : (
          <MediaCardGrid>
            {scoped.events.map((item: any) => {
              const past = isPast(item.date);
              return (
                <MediaCard
                  key={item._id ?? item.id}
                  layout="tint"
                  image={item.bannerUrl}
                  title={eventTitle(item)}
                  meta={formatCardDateTime(item.date, item.time)}
                  badge={past ? "Past" : "New"}
                  badgeTone={past ? "past" : "brand"}
                  onClick={() => navigate(`/event/${item._id ?? item.id}`)}
                  actions={
                    <Button size="sm" variant={past ? "muted" : "primary"}>
                      View Details
                    </Button>
                  }
                />
              );
            })}
          </MediaCardGrid>
        ))}

      {tab === "meetings" &&
        (scoped.meetings.length === 0 ? (
          <EmptyState icon={MdOutlineCalendarMonth} title="No meetings" description="This environment has no meetings scheduled." />
        ) : (
          <MediaCardGrid>
            {scoped.meetings.map((item: any) => {
              const past = isPast(item.event_date);
              return (
                <MediaCard
                  key={item._id ?? item.id}
                  layout="tint"
                  image={item.image}
                  title={item.name}
                  meta={formatCardDateTime(item.event_date)}
                  badge={past ? "Past" : "New"}
                  badgeTone={past ? "past" : "brand"}
                  onClick={() => navigate(`/meeting/${item._id ?? item.id}`)}
                  actions={
                    <Button size="sm" variant={past ? "muted" : "primary"}>
                      View Details
                    </Button>
                  }
                />
              );
            })}
          </MediaCardGrid>
        ))}

      {tab === "chat" && environment.hasChat && <EnvironmentChatTab environmentId={String(id)} environmentName={environment.name} initialMemberId={chatWithMemberId} />}
    </>
  );
};

export default EnvironmentDetailPage;
