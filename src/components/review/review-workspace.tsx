"use client";
import { teamLabel, teamShort } from "@/lib/teams";
import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Flag,
  Sparkles,
  Swords,
  Target,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scoreboard } from "./scoreboard";
import { MatchCatalog, TipCard, TipDialog } from "./catalog";
import { EventInspector, RoundStrip } from "./event-inspector";
import { RoundCoachingTips } from "./round-coaching-tips";
import { PlayerSheet } from "./player-sheet";
import { createMockCoachTips, createReviewData } from "@/data/mock-match";
import { getOfficialReview } from "@/data/official-matches";
import type { CoachTip, MatchInfo, Player, View } from "@/types/match";
const navigation = [
  { id: "overview" as const, title: "Visão geral" },
  { id: "rounds" as const, title: "Rounds e eventos" },
  { id: "catalog" as const, title: "Catálogo tático" },
];
export function ReviewWorkspace({
  fixture,
  initialRound,
}: {
  fixture: MatchInfo;
  initialRound?: number;
}) {
  const isReal = fixture.dataMode === "official-json";
  const officialReview = getOfficialReview(fixture.id);
  const data = useMemo(
    () => officialReview ?? createReviewData(fixture),
    [fixture, officialReview],
  );
  const coachTips = useMemo(
    () => (isReal ? [] : createMockCoachTips(fixture)),
    [fixture, isReal],
  );
  const focusTip = coachTips.find((item) => item.id === "025");
  const [view, setView] = useState<View>(initialRound ? "rounds" : "overview");
  const [selectedRound, setSelectedRound] = useState(
    Math.max(
      1,
      Math.min(initialRound ?? (isReal ? 1 : 18), data.rounds.length),
    ),
  );
  const [player, setPlayer] = useState<Player | null>(null);
  const [tip, setTip] = useState<CoachTip | null>(null);
  const [exported, setExported] = useState(false);
  const totalRounds = fixture.teams.horizon.score + fixture.teams.orbit.score;
  function openRound(round: number) {
    setSelectedRound(Math.max(1, Math.min(round, data.rounds.length)));
    setView("rounds");
  }
  function exportMock() {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            dataMode: isReal ? "official-json" : "mock",
            match: fixture,
            ...data,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob),
      link = document.createElement("a");
    link.href = url;
    link.download = "afterplant-" + fixture.id + ".json";
    link.click();
    URL.revokeObjectURL(url);
    setExported(true);
    window.setTimeout(() => setExported(false), 2500);
  }
  return (
    <AppShell section="review" activeView={view} onView={setView}>
      <div className="page-heading flex justify-between items-center gap-5 mb-7 min-h-[49px] [&_h1]:text-3xl [&_h1]:font-[550] [&_h1]:tracking-[-0.95px] [&_h1]:leading-[1.3] [&_p]:text-muted-foreground [&_p]:text-[14px] [&_p]:leading-[1.6] [&_p]:mt-[7px] [&_>_button]:text-sm [&_>_button]:bg-card max-[650px]:mb-5.5 max-[650px]:gap-3 max-[650px]:[&_h1]:text-[27px] max-[650px]:[&_p]:text-sm max-[650px]:[&_p]:max-w-[245px]">
        <h1>{navigation.find((item) => item.id === view)?.title}</h1>
        <Button variant="outline" onClick={exportMock}>
          {exported ? <Check size={15} /> : <ArrowDownToLine size={15} />}
          {exported ? "Exportado" : "Exportar"}
        </Button>
      </div>
      <section
        className="match-hero min-h-38.5 border border-solid border-border rounded-[8px] relative overflow-hidden flex justify-between items-center p-6.5 gap-[15px] bg-muted max-[650px]:p-[19px] max-[650px]:flex-wrap max-[650px]:justify-center max-[650px]:gap-[15px]"
        aria-label="Resumo da partida"
      >
        <Image
          className="review-map-photo object-cover object-[50%_45%] opacity-45"
          src={"/assets/maps/" + fixture.map.toLowerCase() + ".png"}
          alt=""
          fill
          sizes="1200px"
          priority
        />
        <div className="review-map-shade absolute inset-0 bg-linear-to-r from-background/95 via-background/65 to-background/35" />
        <div className="match-context relative z-1 [&_>_.eyebrow]:text-[12px] [&_>_.eyebrow]:text-muted-foreground [&_h2]:text-[28px] [&_h2]:font-[550] [&_h2]:tracking-[-0.8px] [&_h2]:mt-[5px] [&_h2]:mx-0 [&_h2]:mb-3 max-[650px]:w-full max-[650px]:[&_h2]:mb-2 max-[650px]:[&_h2]:text-[25px]">
          <span className="eyebrow block text-[12px] text-muted-foreground tracking-[0.9px]">
            {fixture.competition}
          </span>
          <h2>{fixture.map}</h2>
          <span className="match-duration flex items-center flex-wrap gap-1.5 text-muted-foreground text-[13px] [&_>_span]:text-muted-foreground [&_>_span]:my-0 [&_>_span]:mx-1 max-[650px]:text-[12px] max-[650px]:gap-[5px]">
            <Clock3 size={13} />
            {fixture.duration}
            <span>·</span>
            {totalRounds} rounds<span>·</span>
            {fixture.date}
          </span>
        </div>
        <div className="match-scoreline relative z-1 flex items-center gap-5.5 pr-3 max-[1300px]:gap-[15px] max-[650px]:gap-[23px] max-[650px]:p-0">
          <div className="hero-team flex items-center gap-[11px] text-sm font-medium [&.orbit_.hero-emblem]:text-primary max-[1300px]:text-sm max-[1300px]:gap-[7px] max-[650px]:text-[14px] text-team-friendly horizon">
            <span className="hero-emblem text-[29px] font-[800] italic text-foreground max-[1000px]:hidden">
              {teamShort("horizon")[0]}
            </span>
            <span>{teamLabel("horizon")}</span>
          </div>
          <div className="hero-score [&_strong:first-child]:text-team-friendly flex items-baseline gap-3.5 tabular-nums [&_strong]:text-[45px] [&_strong]:font-semibold [&_strong]:tracking-[-2px] [&_strong:last-child]:text-primary [&_>_span]:text-2xl [&_>_span]:font-light [&_>_span]:text-muted-foreground max-[650px]:[&_strong]:text-[40px]">
            <strong>{fixture.teams.horizon.score}</strong>
            <span>:</span>
            <strong>{fixture.teams.orbit.score}</strong>
          </div>
          <div className="hero-team flex items-center gap-[11px] text-sm font-medium [&.orbit_.hero-emblem]:text-primary max-[1300px]:text-sm max-[1300px]:gap-[7px] max-[650px]:text-[14px] orbit [&_.team-label]:text-primary [&_.team-label_>_span:nth-child(3)]:text-primary">
            <span>{teamLabel("orbit")}</span>
            <span className="hero-emblem text-[29px] font-[800] italic text-foreground max-[1000px]:hidden">
              {teamShort("orbit")[0]}
            </span>
          </div>
        </div>
      </section>
      <Tabs
        value={view}
        onValueChange={(value) => setView(value as View)}
        className="workspace-tabs gap-0"
      >
        <div className="view-navigation border-b border-solid border-border mt-4.5 mx-0 mb-[23px] flex overflow-x-auto overflow-y-hidden [scrollbar-width:thin]">
          <TabsList className="view-tabs h-16! min-w-max gap-2 bg-transparent p-0 max-[650px]:h-17.5! max-[650px]:w-full max-[650px]:min-w-0 max-[650px]:gap-1">
            {navigation.map(({ id, title }) => (
              <TabsTrigger
                key={id}
                value={id}
                className="relative isolate h-16 rounded-none border-0 bg-transparent! px-6 text-[17px] font-medium text-muted-foreground shadow-none! outline-none after:hidden before:pointer-events-none before:absolute before:inset-0 before:-z-1 before:bg-radial-[at_50%_115%] before:from-primary/30 before:via-primary/10 before:to-transparent before:opacity-0 before:transition-opacity before:content-[''] data-[state=active]:text-foreground data-[state=active]:before:opacity-100 focus-visible:outline-none focus-visible:ring-0 focus-visible:text-primary max-[650px]:h-17.5 max-[650px]:min-w-0 max-[650px]:flex-1 max-[650px]:px-2 max-[650px]:text-sm max-[650px]:leading-relaxed max-[650px]:whitespace-normal motion-reduce:transition-none"
              >
                {title}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="overview" className="view-content m-0 min-w-0">
          <div className="metrics-grid grid grid-cols-3 gap-4 mb-4.5 max-[650px]:gap-2">
            <Metric
              icon={Target}
              label="Conversão da primeira eliminação"
              value={officialReview ? officialReview.metrics.opening.value : "69"}
              detail={
                officialReview
                  ? officialReview.metrics.opening.detail.replace(
                      "· Red",
                      "· Meu time",
                    )
                  : "9 de 13 rounds · Meu time"
              }
            />
            <Metric
              icon={Swords}
              label="Mortes respondidas em até 3 s"
              value={officialReview ? officialReview.metrics.trades.value : "61"}
              detail={
                officialReview
                  ? officialReview.metrics.trades.detail.replace(
                      "· Red",
                      "· Meu time",
                    )
                  : "31 de 51 mortes · Meu time"
              }
            />
            <Metric
              icon={Flag}
              label="Vitórias após o plant"
              value={officialReview ? officialReview.metrics.postplant.value : "75"}
              detail={
                officialReview
                  ? officialReview.metrics.postplant.detail.replace(
                      "· Red",
                      "· Meu time",
                    )
                  : "6 de 8 plants · Meu time"
              }
            />
          </div>
          {focusTip && (
            <div className="training-focus flex items-center gap-[15px] border border-solid border-primary/30 bg-linear-to-r from-primary/10 to-card rounded-[7px] p-[19px] mb-6 [&_.eyebrow]:text-[12px] [&_.eyebrow]:text-primary [&_.eyebrow]:tracking-[0.4px] [&_h2]:text-[15px] [&_h2]:font-medium [&_h2]:mt-1.5 [&_p]:text-[13px] [&_p]:text-muted-foreground [&_p]:mt-[5px] [&_p]:leading-[1.6] [&_>_button]:ml-auto [&_>_button]:shrink-0 [&_>_button]:text-[13px] [&_>_button]:bg-muted max-[650px]:p-[15px] max-[650px]:flex-wrap max-[650px]:gap-3 max-[650px]:[&_h2]:text-sm max-[650px]:[&_p]:text-[13px] max-[650px]:[&_>_button]:ml-0 max-[650px]:[&_>_button]:h-[29px]">
              <span className="focus-icon text-primary bg-primary/10 rounded-md p-3 max-[650px]:hidden">
                <Target size={22} />
              </span>
              <div>
                <span className="eyebrow block text-[12px] text-muted-foreground tracking-[0.9px]">
                  Foco do próximo treino
                </span>
                <h2>Preserve a vantagem do primeiro abate.</h2>
                <p>
                  Revise os rounds em que a primeira eliminação terminou em
                  derrota.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setTip(focusTip)}
              >
                Ver evidências
                <ArrowUpRight size={14} />
              </Button>
            </div>
          )}
          <div className="overview-grid grid grid-cols-[minmax(0,_1fr)_282px] gap-5.5 items-start max-[1300px]:grid-cols-[minmax(0,_1fr)_250px] max-[1300px]:gap-4 max-[1000px]:grid-cols-1">
            <Scoreboard
              match={fixture}
              players={data.players}
              onPlayer={setPlayer}
            />
            <aside className="insights-column max-[1000px]:grid max-[1000px]:grid-cols-3 max-[1000px]:gap-3 max-[650px]:grid-cols-1">
              <div className="insights-heading flex items-center gap-[9px] pt-[9px] px-0 pb-4.5 [&_>_svg]:text-primary [&_h2]:text-[14px] [&_h2]:font-medium [&_>_[data-slot=badge]]:ml-auto [&_>_[data-slot=badge]]:text-[12px] [&_>_[data-slot=badge]]:text-muted-foreground max-[1000px]:col-[1/-1] max-[1000px]:pt-[7px] max-[1000px]:px-0 max-[1000px]:pb-0">
                <Sparkles size={17} />
                <h2>Pontos para revisar</h2>
                <Badge variant="outline">{coachTips.length}</Badge>
              </div>
              {coachTips.slice(0, 3).map((item) => (
                <TipCard
                  key={item.id}
                  tip={item}
                  compact
                  onClick={() => setTip(item)}
                />
              ))}
              <Button
                variant="ghost"
                className="all-tips-button w-full border border-dashed border-border h-[35px] text-[13px] text-muted-foreground max-[1000px]:col-[1/-1]"
                onClick={() => setView("catalog")}
              >
                Ver catálogo
                <ArrowRight size={14} />
              </Button>
            </aside>
          </div>
          <section className="panel border border-solid border-border rounded-[8px] overflow-hidden bg-card round-preview mt-6 [&_.section-heading]:pb-2.5 [&_.section-heading_button]:text-[13px] [&_.section-heading_button]:text-muted-foreground">
            <div className="section-heading flex justify-between items-center gap-[13px] p-[21px] [&_h2]:text-sm [&_h2]:font-medium [&_h3]:text-sm [&_h3]:font-medium [&_p]:text-muted-foreground [&_p]:text-[13px] [&_p]:leading-[1.6] [&_p]:mt-1.5 max-[650px]:py-[17px] max-[650px]:px-3.5 max-[650px]:[&_h2]:text-[14px]">
              <h2>Rounds</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openRound(selectedRound)}
              >
                Ver eventos
                <ArrowUpRight size={14} />
              </Button>
            </div>
            <RoundStrip
              match={fixture}
              rounds={data.rounds}
              onRound={openRound}
            />
          </section>
        </TabsContent>
        <TabsContent value="rounds" className="view-content m-0 min-w-0">
          <EventInspector
            key={fixture.id + selectedRound}
            match={fixture}
            players={data.players}
            rounds={data.rounds}
            roundNumber={selectedRound}
            onRound={openRound}
          />
          <RoundCoachingTips
            match={fixture}
            round={data.rounds[selectedRound - 1]}
            players={data.players}
          />
        </TabsContent>
        <TabsContent value="catalog" className="view-content m-0 min-w-0">
          {isReal && (
            <p className="mb-4 text-sm text-muted-foreground">
              Os eventos desta partida vêm do JSON. O motor de dicas ainda não
              foi executado; nenhum achado foi inventado.
            </p>
          )}
          <MatchCatalog tips={coachTips} onTip={setTip} onRound={openRound} />
        </TabsContent>
      </Tabs>
      <PlayerSheet
        match={fixture}
        player={player}
        onClose={() => setPlayer(null)}
        onRound={openRound}
      />
      <TipDialog tip={tip} onClose={() => setTip(null)} onRound={openRound} />
    </AppShell>
  );
}
function Metric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="metric-card border border-solid border-border rounded-[7px] bg-card p-[19px] max-[1300px]:p-4 max-[650px]:py-3 max-[650px]:px-[9px]">
      <div className="metric-label flex items-center gap-2 text-muted-foreground text-[13px] [&_svg]:text-muted-foreground max-[1300px]:text-[12px] max-[650px]:text-[12px] max-[650px]:gap-[5px] max-[650px]:items-start max-[650px]:leading-[1.5] max-[650px]:[&_svg]:w-[11px] max-[650px]:[&_svg]:shrink-0 max-[650px]:[&_svg]:mt-px">
        <Icon size={16} />
        <span>{label}</span>
      </div>
      <strong className="metric-value block text-[33px] tracking-[-1px] font-medium mt-4.5 [&_>_span]:text-[19px] [&_>_span]:text-muted-foreground [&_>_span]:ml-[3px] max-[650px]:text-[26px] max-[650px]:mt-[11px] max-[650px]:[&_>_span]:text-sm">
        {value}
        <span>%</span>
      </strong>
      <p className="metric-detail text-[12px] text-muted-foreground mt-[5px] max-[650px]:text-[12px] max-[650px]:leading-[1.6]">
        {detail}
      </p>
    </div>
  );
}
