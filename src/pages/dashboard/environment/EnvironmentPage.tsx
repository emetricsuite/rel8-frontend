import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "react-query";
import { FiUsers, FiMessageCircle, FiChevronRight } from "react-icons/fi";

import { fetchAllMembers } from "../../../api/members/api-members";
import { fetchEnvironmentsByType, EnvironmentRecord } from "../../../api/environments/environments-api";
import { fetchMemberTypes } from "../../../api/member-types/member-types-api";

import { Button, Card, EmptyState, PageHeader, Pagination, PersonCard, PersonCardGrid, SearchInput, Tabs, TabItem } from "../../../components/ui";
import CircleLoader from "../../../components/loaders/CircleLoader";
import { ENV, ENVS } from "../../../clients/labels";

const PER_PAGE = 12;

type TabKey = "members" | "exco" | "committee" | "general" | "types";

const TABS: TabItem[] = [
  { key: "members", label: `Member ${ENV}` },
  { key: "exco", label: `Excos ${ENV}` },
  { key: "committee", label: "Committees" },
  { key: "general", label: "Groups" },
  { key: "types", label: "Member Types" },
];

/** One tile's worth of data, whichever tab produced it. */
interface Person {
  id: string;
  name: string;
  role?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  status?: string | null;
  /** Only members have a profile page; exco seats may not map to an account. */
  memberId?: string | null;
  /** First chat-enabled environment this person shares — where "Chat Up" leads. */
  chatEnvironmentId?: string | null;
  /** The environment this seat belongs to — clicking the card opens it. */
  environmentId?: string;
  environmentName?: string;
}

const titleCase = (value?: string | null) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : "");

/** `positions[]` from every environment of one type, flattened and ordered. */
const positionsToPeople = (environments: EnvironmentRecord[]): Person[] =>
  environments.flatMap(environment =>
    (environment.positions ?? [])
      .slice()
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map(position => ({
        id: position._id,
        name: position.name,
        role: position.title,
        email: position.email,
        imageUrl: position.imageUrl,
        // A seat is a seat — it carries no membership standing of its own, so no chip.
        status: null,
        memberId: position.memberId ?? null,
        environmentId: environment._id,
        environmentName: environment.name,
      }))
  );

const EnvironmentPage = () => {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("members");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const members = useQuery("members", fetchAllMembers, { staleTime: 5 * 60 * 1000 });
  const excos = useQuery(["environments", "exco"], () => fetchEnvironmentsByType("exco"), { staleTime: 5 * 60 * 1000 });
  const committees = useQuery(["environments", "committee"], () => fetchEnvironmentsByType("committee"), { staleTime: 5 * 60 * 1000 });
  const groups = useQuery(["environments", "general"], () => fetchEnvironmentsByType("general"), { staleTime: 5 * 60 * 1000 });
  const memberTypes = useQuery("memberTypes", fetchMemberTypes, { staleTime: 10 * 60 * 1000 });

  const changeSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const changeTab = (key: string) => {
    setTab(key as TabKey);
    setSearch("");
    setPage(1);
  };

  /* ------------------------------------------------------------------ people tabs -- */

  /**
   * Environment ids that actually have chat turned on.
   *
   * `GET /api/members` gives each member `environments: [{_id, name}]` but not `hasChat`,
   * and the server refuses `joinEnvironment` on an environment without it — so the two
   * have to be crossed here to know whether "Chat Up" has anywhere to go.
   */
  const chatEnabledIds = useMemo(() => {
    const ids = new Set<string>();
    [...(excos.data ?? []), ...(committees.data ?? []), ...(groups.data ?? [])].forEach(environment => {
      if (environment.hasChat) ids.add(String(environment._id));
    });
    return ids;
  }, [excos.data, committees.data, groups.data]);

  const people: Person[] = useMemo(() => {
    if (tab === "members") {
      const rows = Array.isArray(members.data) ? members.data : [];
      return rows.map((member: any) => ({
        id: member._id,
        name: member.name,
        // `jobTitle` is free text on the member; `memberType` is the populated
        // { name, description } the backend joins in getAllMembers.
        role: member.jobTitle || member.memberType?.name || null,
        email: member.email,
        imageUrl: member.imageUrl,
        // Membership standing — NOT `isActive`, which is account deactivation.
        status: titleCase(member.status),
        memberId: member._id,
        chatEnvironmentId: (member.environments ?? []).map((e: any) => String(e._id)).find((envId: string) => chatEnabledIds.has(envId)) ?? null,
      }));
    }
    if (tab === "exco") return positionsToPeople(excos.data ?? []);
    if (tab === "committee") return positionsToPeople(committees.data ?? []);
    if (tab === "general") return positionsToPeople(groups.data ?? []);
    return [];
  }, [tab, members.data, excos.data, committees.data, groups.data, chatEnabledIds]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return people;
    return people.filter(person => `${person.name} ${person.email ?? ""} ${person.role ?? ""}`.toLowerCase().includes(needle));
  }, [people, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const current = Math.min(page, totalPages);
  const visible = filtered.slice((current - 1) * PER_PAGE, current * PER_PAGE);

  const isLoading = tab === "members" ? members.isLoading : tab === "exco" ? excos.isLoading : tab === "committee" ? committees.isLoading : tab === "general" ? groups.isLoading : memberTypes.isLoading;

  const noun = tab === "members" ? "Member" : tab === "exco" ? "Exco" : tab === "committee" ? "Committee Member" : tab === "general" ? "Group Member" : "Member Type";
  const searchPlaceholder = tab === "members" ? "Search member by email, name" : tab === "exco" ? "Search exco by email, name" : `Search ${noun.toLowerCase()} by email, name`;

  /* ----------------------------------------------------------------- member types -- */

  const types = useMemo(() => {
    const rows = memberTypes.data ?? [];
    const needle = search.trim().toLowerCase();
    return needle ? rows.filter(t => `${t.name} ${t.description ?? ""}`.toLowerCase().includes(needle)) : rows;
  }, [memberTypes.data, search]);

  return (
    <>
      <PageHeader title={`Welcome To Your ${ENVS}`} subtitle="See your organization members and excos here" />

      <Tabs tabs={TABS} active={tab} onChange={changeTab} />

      <div className="mb-6">
        <SearchInput value={search} onChange={changeSearch} placeholder={searchPlaceholder} />
      </div>

      {isLoading ? (
        <div className="py-20 grid place-items-center">
          <CircleLoader />
        </div>
      ) : tab === "types" ? (
        types.length === 0 ? (
          <EmptyState icon={FiUsers} title="No member types" description="This organization has not defined any membership grades yet." />
        ) : (
          <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {types.map(type => (
              <Card key={type._id} className="p-5 flex items-start gap-4 hover:border-org-primary/40 transition-colors cursor-pointer" onClick={() => navigate(`/member-types/${type._id}`)}>
                <span className="w-11 h-11 rounded-full bg-org-tint grid place-items-center flex-shrink-0">
                  <FiUsers className="w-5 h-5 text-org-primary" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-medium text-org-primary truncate">{type.name}</span>
                  {type.description && <span className="block text-sm text-muted mt-0.5 line-clamp-2">{type.description}</span>}
                </span>
                <FiChevronRight className="w-5 h-5 text-muted flex-shrink-0 mt-3" />
              </Card>
            ))}
          </div>
        )
      ) : filtered.length === 0 ? (
        <EmptyState icon={FiUsers} title={search ? `No ${noun.toLowerCase()}s match "${search}"` : `No ${noun.toLowerCase()}s yet`} description={search ? "Try a different name or email." : "Nothing has been added to this environment yet."} />
      ) : (
        <>
          <p className="text-[15px] text-ink mb-4">
            {filtered.length} {noun}
            {filtered.length === 1 ? "" : "s"}
          </p>

          <PersonCardGrid>
            {visible.map(person => (
              <PersonCard
                key={person.id}
                name={person.name}
                role={person.environmentName ? `${person.role} · ${person.environmentName}` : person.role}
                email={person.email}
                imageUrl={person.imageUrl}
                status={person.status}
                // A seat opens its environment; a member opens their profile.
                onClick={person.environmentId ? () => navigate(`/environment/${person.environmentId}`) : person.memberId ? () => navigate(`/members/${person.memberId}`) : undefined}
                actions={
                  /*
                   * There is no standalone Chat page any more — chat belongs to an
                   * Environment (M13). So this opens the chat of the first chat-enabled
                   * environment the two of you share, with their conversation selected.
                   * If you share none, there is nowhere to talk and the button is hidden
                   * rather than left as a dead link.
                   */
                  person.chatEnvironmentId ? (
                    <Button
                      size="sm"
                      icon={FiMessageCircle}
                      onClick={event => {
                        event.stopPropagation();
                        navigate(`/environment/${person.chatEnvironmentId}?tab=chat&member=${person.memberId}`);
                      }}
                    >
                      Chat Up
                    </Button>
                  ) : undefined
                }
              />
            ))}
          </PersonCardGrid>

          <Pagination page={current} totalPages={totalPages} onChange={setPage} />
        </>
      )}
    </>
  );
};

export default EnvironmentPage;
