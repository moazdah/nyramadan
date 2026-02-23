import React, { useEffect, useMemo, useState } from "react";
import SunCalc from "suncalc";

const OSLO = { lat: 59.9139, lon: 10.7522 };
const TZ = "Europe/Oslo";

// Fast definert av deg
const RAMADAN_START_ISO = "2026-02-18"; // onsdag 18 februar 2026
const RAMADAN_LENGTH_DAYS = 29;

function clamp(n, a, b) {
  return Math.max(a, Math.min(b, n));
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

function formatTimeOslo(date) {
  const parts = new Intl.DateTimeFormat("nb-NO", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).formatToParts(date);

  const h = parts.find(p => p.type === "hour")?.value ?? "00";
  const m = parts.find(p => p.type === "minute")?.value ?? "00";
  const s = parts.find(p => p.type === "second")?.value ?? "00";
  return `${h}:${m}:${s}`;
}

function formatDateOslo(date) {
  return new Intl.DateTimeFormat("nb-NO", {
    timeZone: TZ,
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  }).format(date);
}

function startOfDayOslo(date) {
  // Lager en "lokal Oslo dato" ved å formatere til YYYY-MM-DD og lage en Date av den.
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);

  return new Date(`${ymd}T00:00:00`);
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = pad2(d.getMonth() + 1);
  const da = pad2(d.getDate());
  return `${y}-${m}-${da}`;
}

function diffDays(a, b) {
  // a og b er Date på midnatt
  const ms = 24 * 60 * 60 * 1000;
  return Math.round((a.getTime() - b.getTime()) / ms);
}

function getSunTimesOslo(dateNow) {
  // Vi bruker datoen i Oslo, men SunCalc trenger en faktisk Date, vi bruker "Oslo start of day" som base.
  const dayStart = startOfDayOslo(dateNow);
  const times = SunCalc.getTimes(dayStart, OSLO.lat, OSLO.lon);
  return times;
}

function percent(numer, denom) {
  if (denom <= 0) return 0;
  return clamp((numer / denom) * 100, 0, 100);
}

function ProgressRing({ value, label }) {
  const size = 168;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = (value / 100) * c;

  return (
    <div className="ringCard">
      <svg width={size} height={size} className="ring">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(203, 160, 40, 0.20)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(203, 160, 40, 0.95)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ringCenter">
        <div className="ringValue">{Math.round(value)}%</div>
        <div className="ringLabel">{label}</div>
      </div>
    </div>
  );
}

function Modal({ open, title, children, onClose }) {
  if (!open) return null;
  return (
    <div className="modalOverlay" role="dialog" aria-modal="true">
      <div className="modal">
        <div className="modalHeader">
          <div className="modalTitle">{title}</div>
          <button className="btn ghost" onClick={onClose} aria-label="Lukk">
            Lukk
          </button>
        </div>
        <div className="modalBody">{children}</div>
      </div>
    </div>
  );
}

function buildRamadanDays() {
  const days = [];
  for (let i = 0; i < RAMADAN_LENGTH_DAYS; i++) {
    const iso = addDays(RAMADAN_START_ISO, i);
    days.push({
      dayNumber: i + 1,
      isoDate: iso
    });
  }
  return days;
}

function importantForDay(dayNumber) {
  // Viktige ting som kan vises når dagen er aktiv
  // Du kan utvide dette senere uten å endre logikken rundt låsing
  const items = [];

  if (dayNumber === 1) {
    items.push({
      key: "start",
      title: "Første dag av Ramadan",
      short:
        "En ny start. Mange setter intensjon, lager en enkel plan og bygger gode vaner fra dag én.",
      more:
        "Fokuser på små, stabile handlinger. Hold det realistisk: bønn, lesing, givertjeneste, og godhet i hverdagen. Målet er kontinuitet."
    });
  }

  if (dayNumber === 17) {
    items.push({
      key: "nuzul",
      title: "Nuzul al Quran",
      short:
        "I mange miljøer markeres dette som et tidspunkt knyttet til åpenbaringen av Koranen.",
      more:
        "Dato og tradisjon varierer. En fin måte å markere det på er ekstra lesing, refleksjon, og en konkret liten handling som du tar med videre."
    });
  }

  if (dayNumber >= 21) {
    items.push({
      key: "last10",
      title: "De siste ti dagene",
      short:
        "Nå begynner den mest intense delen for mange. Flere øker nattbønn, lesing og fokus.",
      more:
        "Mange søker Laylat al Qadr i de siste ti, spesielt oddetallsnettene. En enkel plan: litt ekstra hver kveld, og mer på oddetallsnettene."
    });
  }

  if ([21, 23, 25, 27, 29].includes(dayNumber)) {
    items.push({
      key: `odd-${dayNumber}`,
      title: `Oddetallsnatt rundt dag ${dayNumber}`,
      short:
        "Mange legger ekstra innsats i disse nettene når de søker Laylat al Qadr.",
      more:
        "Tradisjonelt anbefales det å søke den i de siste ti, særlig på oddetallsnetter. Gjør det enkelt: ekstra dua, litt mer Koran, og rolig fokus."
    });
  }

  if (dayNumber === 27) {
    items.push({
      key: "qadr",
      title: "Laylat al Qadr",
      short:
        "Mange forbinder denne perioden med Natten av verdi og søker den spesielt rundt dag 27.",
      more:
        "Den eksakte natten er ikke entydig, derfor er anbefalingen å søke den i flere av de siste ti nettene, særlig oddetallsnetter. Prioriter bønn, dua, Koran og givertjeneste."
    });
  }

  if (dayNumber === 29) {
    items.push({
      key: "end",
      title: "Siste dag",
      short:
        "Siste etappe. En fin dag for takknemlighet, oppsummering, og å planlegge hva du tar med videre.",
      more:
        "Skriv ned tre ting som gikk bra, én ting du vil forbedre, og én vane du vil fortsette med etter Ramadan."
    });
  }

  return items;
}

function isDayUnlocked(todayIso, dayIso) {
  // Låser fremtidige dager helt
  return dayIso <= todayIso;
}

function isoTodayOslo(dateNow) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(dateNow);
}

function App() {
  const [now, setNow] = useState(new Date());
  const [selectedDayIso, setSelectedDayIso] = useState(null);
  const [modal, setModal] = useState({ open: false, title: "", body: "" });

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 250);
    return () => clearInterval(t);
  }, []);

  const ramadanDays = useMemo(() => buildRamadanDays(), []);
  const todayIso = useMemo(() => isoTodayOslo(now), [now]);

  const ramadanStart = useMemo(() => new Date(`${RAMADAN_START_ISO}T00:00:00`), []);
  const todayStart = useMemo(() => startOfDayOslo(now), [now]);

  const dayIndexFromStart = useMemo(() => diffDays(todayStart, ramadanStart), [todayStart, ramadanStart]);
  const isInRamadan = dayIndexFromStart >= 0 && dayIndexFromStart < RAMADAN_LENGTH_DAYS;

  const todaysSun = useMemo(() => getSunTimesOslo(now), [now]);

  const sunProgress = useMemo(() => {
    const sunrise = todaysSun.sunrise?.getTime();
    const sunset = todaysSun.sunset?.getTime();
    const t = now.getTime();

    if (!sunrise || !sunset) return 0.45;

    if (t <= sunrise) return 0.08;
    if (t >= sunset) return 0.92;

    return clamp((t - sunrise) / (sunset - sunrise), 0, 1);
  }, [todaysSun, now]);

  const sunAltitude = useMemo(() => {
    const pos = SunCalc.getPosition(now, OSLO.lat, OSLO.lon);
    return pos.altitude;
  }, [now]);

  const backgroundGlow = useMemo(() => {
    // Holder alltid siden lys, men gir litt ekstra midt på dagen
    const normalized = clamp((sunAltitude + 0.2) / 1.2, 0, 1);
    return 0.55 + normalized * 0.35;
  }, [sunAltitude]);

  const currentRamadanDayNumber = useMemo(() => {
    if (!isInRamadan) return null;
    return dayIndexFromStart + 1;
  }, [isInRamadan, dayIndexFromStart]);

  const completedDays = useMemo(() => {
    if (!isInRamadan) return 0;

    const sunset = todaysSun.sunset?.getTime();
    const t = now.getTime();
    const dayNum = currentRamadanDayNumber ?? 1;

    // Logikk: Dagen teller som fullført først etter solnedgang
    if (sunset && t >= sunset) return dayNum;
    return Math.max(0, dayNum - 1);
  }, [isInRamadan, todaysSun, now, currentRamadanDayNumber]);

  const remainingDays = useMemo(() => {
    if (!isInRamadan) return RAMADAN_LENGTH_DAYS;
    return clamp(RAMADAN_LENGTH_DAYS - completedDays, 0, RAMADAN_LENGTH_DAYS);
  }, [isInRamadan, completedDays]);

  const completedPct = useMemo(() => percent(completedDays, RAMADAN_LENGTH_DAYS), [completedDays]);
  const remainingPct = useMemo(() => 100 - completedPct, [completedPct]);

  const todayImportant = useMemo(() => {
    if (!isInRamadan || !currentRamadanDayNumber) return [];
    return importantForDay(currentRamadanDayNumber);
  }, [isInRamadan, currentRamadanDayNumber]);

  const sunriseStr = useMemo(() => {
    const d = todaysSun.sunrise;
    if (!d) return "Ukjent";
    return new Intl.DateTimeFormat("nb-NO", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
  }, [todaysSun]);

  const sunsetStr = useMemo(() => {
    const d = todaysSun.sunset;
    if (!d) return "Ukjent";
    return new Intl.DateTimeFormat("nb-NO", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
  }, [todaysSun]);

  const selectedDay = useMemo(() => {
    if (!selectedDayIso) return null;
    const found = ramadanDays.find(d => d.isoDate === selectedDayIso);
    return found ?? null;
  }, [selectedDayIso, ramadanDays]);

  const selectedUnlocked = useMemo(() => {
    if (!selectedDayIso) return false;
    return isDayUnlocked(todayIso, selectedDayIso);
  }, [todayIso, selectedDayIso]);

  const selectedImportant = useMemo(() => {
    if (!selectedDay) return [];
    return importantForDay(selectedDay.dayNumber);
  }, [selectedDay]);

  function openMore(title, body) {
    setModal({ open: true, title, body });
  }

  const titleLine = isInRamadan
    ? `Ramadan dag ${currentRamadanDayNumber} av ${RAMADAN_LENGTH_DAYS}`
    : "Ramadan oversikt";

  return (
    <div
      className="app"
      style={{
        ["--sun-x"]: `${sunProgress * 100}%`,
        ["--glow"]: backgroundGlow
      }}
    >
      <div className="sunLayer" aria-hidden="true">
        <div className="sun" />
        <div className="softGlow" />
        <div className="pattern" />
      </div>

      <header className="header">
        <div className="brand">
          <div className="brandMark" aria-hidden="true">☾</div>
          <div className="brandText">
            <div className="brandTitle">Ramadan i Oslo</div>
            <div className="brandSub">{formatDateOslo(now)}</div>
          </div>
        </div>

        <div className="clockCard">
          <div className="clockTime">{formatTimeOslo(now)}</div>
          <div className="clockMeta">
            Soloppgang {sunriseStr} · Solnedgang {sunsetStr}
          </div>
        </div>
      </header>

      <main className="main">
        <section className="hero">
          <div className="heroLeft">
            <h1 className="h1">{titleLine}</h1>
            <p className="lead">
              Lys, ro og fokus. Fremdriften oppdateres automatisk etter solnedgang i Oslo.
            </p>

            <div className="statsRow">
              <div className="stat">
                <div className="statValue">{completedDays}</div>
                <div className="statLabel">Dager fullført</div>
              </div>
              <div className="stat">
                <div className="statValue">{remainingDays}</div>
                <div className="statLabel">Dager igjen</div>
              </div>
              <div className="stat">
                <div className="statValue">{Math.round(remainingPct)}%</div>
                <div className="statLabel">Gjenstår</div>
              </div>
            </div>

            <div className="note">
              Tider her følger soloppgang og solnedgang og er laget for tema og flyt, ikke som bønnetider.
            </div>
          </div>

          <div className="heroRight">
            <ProgressRing value={completedPct} label="Fastet" />
          </div>
        </section>

        {todayImportant.length > 0 && (
          <section className="today">
            <div className="sectionTitle">I dag</div>
            <div className="cards">
              {todayImportant.map(item => (
                <div className="card" key={item.key}>
                  <div className="cardTitle">{item.title}</div>
                  <div className="cardText">{item.short}</div>
                  <div className="cardActions">
                    <button className="btn" onClick={() => openMore(item.title, item.more)}>
                      Se mer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="explore">
          <div className="sectionHead">
            <div>
              <div className="sectionTitle">Dag for dag</div>
              <div className="sectionSub">
                Trykk på en dag for en kort forklaring. Fremtidige dager er låst.
              </div>
            </div>

            <div className="pill">
              {isInRamadan ? `Du er på dag ${currentRamadanDayNumber}` : "Utenfor Ramadan perioden"}
            </div>
          </div>

          <div className="grid">
            {ramadanDays.map(d => {
              const unlocked = isDayUnlocked(todayIso, d.isoDate);
              const isToday = d.isoDate === todayIso;
              const isSelected = d.isoDate === selectedDayIso;

              return (
                <button
                  key={d.isoDate}
                  className={[
                    "dayCell",
                    unlocked ? "unlocked" : "locked",
                    isToday ? "todayCell" : "",
                    isSelected ? "selected" : ""
                  ].join(" ")}
                  onClick={() => setSelectedDayIso(d.isoDate)}
                >
                  <div className="dayTop">
                    <div className="dayNum">Dag {d.dayNumber}</div>
                    <div className="dayIso">{d.isoDate}</div>
                  </div>
                  <div className="dayHint">
                    {unlocked ? (isToday ? "I dag" : "Åpne") : "Låst"}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="detailPanel">
            {!selectedDay && (
              <div className="detailEmpty">
                Velg en dag for å se detaljer.
              </div>
            )}

            {selectedDay && !selectedUnlocked && (
              <div className="detailLocked">
                <div className="detailTitle">Dag {selectedDay.dayNumber}</div>
                <div className="detailText">
                  Denne dagen er ikke her enda. Innholdet blir tilgjengelig når datoen kommer.
                </div>
              </div>
            )}

            {selectedDay && selectedUnlocked && (
              <div className="detailOpen">
                <div className="detailTitle">
                  Dag {selectedDay.dayNumber} · {selectedDay.isoDate}
                </div>

                {selectedImportant.length === 0 ? (
                  <div className="detailText">
                    Ingen spesielle markeringer er satt for denne dagen. Bruk den til stabilitet og gode vaner.
                  </div>
                ) : (
                  <div className="detailList">
                    {selectedImportant.map(item => (
                      <div className="detailItem" key={item.key}>
                        <div className="detailItemTitle">{item.title}</div>
                        <div className="detailItemText">{item.short}</div>
                        <div className="detailItemActions">
                          <button className="btn" onClick={() => openMore(item.title, item.more)}>
                            Se mer
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <footer className="footer">
          <div className="footerInner">
            <div className="footerTitle">Ramadan tema, lyst og rolig</div>
            <div className="footerText">
              Solen og lysstyrken følger Oslo gjennom dagen, men siden er alltid lys. Du kan bygge videre med flere kort, dua samling, mål og notater.
            </div>
          </div>
        </footer>
      </main>

      <Modal
        open={modal.open}
        title={modal.title}
        onClose={() => setModal({ open: false, title: "", body: "" })}
      >
        <div className="modalText">{modal.body}</div>
      </Modal>
    </div>
  );
}

export default App;
