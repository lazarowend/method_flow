import { COMPETITIONS } from './competitions';

export interface Fixture {
  id: number;
  /** Nome formatado, ex: "Time A x Time B" */
  game: string;
  /** Horário (HH:MM) no fuso do Brasil */
  time: string;
  /** Nome da liga retornado pela API */
  league: string;
}

export type MatchSearchResult =
  | { status: 'ok'; matches: Fixture[]; source: string }
  | { status: 'no-key'; matches: Fixture[]; source: string }
  | { status: 'unavailable'; matches: Fixture[]; source: string };

/**
 * Interface comum de fonte de jogos. Cada provider implementa o mesmo contrato.
 * Retorna `null` quando não cobre aquele campeonato (aí tentamos o próximo).
 * Lança erro quando a chamada falha (rede/cota) — tratado no orquestrador.
 */
interface MatchProvider {
  name: string;
  /** Busca os jogos de um campeonato em uma data; `null` = liga não coberta. */
  search(competition: string, date: string): Promise<Fixture[] | null>;
}

/** Converte timestamp (ms) para "HH:MM" no fuso local do navegador (Brasil). */
function tsToLocalTime(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Retorna a data local (YYYY-MM-DD) de um timestamp (ms), no fuso do navegador. */
function tsToLocalDate(ms: number): string {
  if (!ms) return '';
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// =====================================================================
// PROVIDER: ESPN (principal — gratuita, sem chave, com placar)
// =====================================================================

// Mapeia nome do campeonato (lista local) → slug da liga no ESPN.
const ESPN_LEAGUE_SLUG: Record<string, string> = {
  'Inglaterra - Premier League': 'eng.1',
  'Inglaterra - EFL Championship': 'eng.2',
  'Inglaterra - FA Cup': 'eng.fa',
  'Inglaterra - EFL Cup (Carabao Cup)': 'eng.league_cup',
  'Espanha - LALIGA EA SPORTS': 'esp.1',
  'Espanha - LALIGA HYPERMOTION': 'esp.2',
  'Espanha - Copa del Rey': 'esp.copa_del_rey',
  'Alemanha - Bundesliga': 'ger.1',
  'Alemanha - 2. Bundesliga': 'ger.2',
  'Alemanha - DFB-Pokal': 'ger.dfbpokal',
  'Itália - Serie A': 'ita.1',
  'Itália - Serie B': 'ita.2',
  'Itália - Coppa Italia': 'ita.coppa',
  'França - Ligue 1': 'fra.1',
  'França - Ligue 2': 'fra.2',
  'França - Coupe de France': 'fra.coupe',
  'Holanda - Eredivisie': 'ned.1',
  'Holanda - KNVB Beker': 'ned.cup',
  'Portugal - Liga Portugal': 'por.1',
  'Portugal - Liga Portugal 2': 'por.2',
  'Portugal - Taça de Portugal': 'por.cup',
  'Brasil - Campeonato Brasileiro Série A': 'bra.1',
  'Brasil - Campeonato Brasileiro Série B': 'bra.2',
  'Brasil - Copa do Brasil': 'bra.copa_brasil',
  'Argentina - Liga Profesional de Fútbol': 'arg.1',
  'Argentina - Copa Argentina': 'arg.copa_argentina',
  'México - Liga MX': 'mex.1',
  'México - Copa MX': 'mex.copa_mx',
  'Uruguai - Campeonato Uruguayo': 'uru.1',
  'EUA - Major League Soccer (MLS)': 'usa.1',
  'Escócia - Scottish Premiership': 'sco.1',
  'Bélgica - Jupiler Pro League': 'bel.1',
  'Rússia - Russian Premier League': 'rus.1',
  'Rússia - Russian Cup': 'rus.cup',
  'Europa - UEFA Champions League': 'uefa.champions',
  'Europa - UEFA Europa League': 'uefa.europa',
  'Europa - UEFA Conference League': 'uefa.europa_conf',
  'Europa - UEFA Nations League': 'uefa.nations',
  'Europa - UEFA Euro': 'uefa.euro',
  'Europa - UEFA Super Cup': 'uefa.supercup',
};

/**
 * Busca jogos na ESPN. A API expõe a aba de scoreboard da liga, filtrada por data.
 * Não requer chave. Datas no formato YYYYMMDD.
 */
async function searchEspn(competition: string, date: string): Promise<Fixture[] | null> {
  const slug = ESPN_LEAGUE_SLUG[competition];
  if (!slug) return null; // liga não coberta → tentar próximo provider

  const yyyymmdd = date.replace(/-/g, '');
  // A ESPN trabalha em UTC; para cobrir a data BR, busca o dia anterior/post.
  const days: string[] = [yyyymmdd];
  const dt = new Date(date + 'T00:00:00');
  const prev = new Date(dt);
  prev.setDate(prev.getDate() - 1);
  days.push(prev.toISOString().split('T')[0].replace(/-/g, ''));
  const next = new Date(dt);
  next.setDate(next.getDate() + 1);
  days.push(next.toISOString().split('T')[0].replace(/-/g, ''));

  const all: any[] = [];
  for (const day of days) {
    const url = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/scoreboard?dates=${day}`;
    const res = await fetch(url, { headers: { 'User-Agent': navigator.userAgent } });
    if (!res.ok) continue;
    const json = await res.json();
    all.push(...(json?.events ?? []));
  }

  // Filtra pela data local (Brasil) e deduplica.
  const seen = new Set<string>();
  const filtered = all
    .filter((e) => {
      const start = e?.competitions?.[0]?.date ? new Date(e.competitions[0].date).getTime() : 0;
      const localDate = tsToLocalDate(start);
      if (localDate !== date) return false;
      const key = e?.id ?? '';
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => {
      const da = a?.competitions?.[0]?.date ? new Date(a.competitions[0].date).getTime() : 0;
      const db = b?.competitions?.[0]?.date ? new Date(b.competitions[0].date).getTime() : 0;
      return da - db;
    });

  return filtered.map((e) => {
    const comp = e?.competitions?.[0] ?? {};
    const [home, away] = comp?.competitors ?? [];
    const league = e?.league?.name ?? e?.name ?? '';
    return {
      id: Number(e?.id ?? 0),
      game: `${home?.team?.displayName ?? '?'} x ${away?.team?.displayName ?? '?'}`,
      time: tsToLocalTime(comp?.date ? new Date(comp.date).getTime() : 0),
      league,
    };
  });
}

// =====================================================================
// PROVIDER: SportAPI7 (fallback — requer chave RapidAPI, tem cota)
// =====================================================================

const SPORTAPI_BASE = 'https://sportapi7.p.rapidapi.com';
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY as string | undefined;

interface SportApiLeagueMap {
  category: number;
  tournament: string;
}

const SPORTAPI_LEAGUE_MAP: Record<string, SportApiLeagueMap> = {
  'Inglaterra - Premier League': { category: 1, tournament: 'Premier League' },
  'Inglaterra - EFL Championship': { category: 1, tournament: 'Championship' },
  'Inglaterra - FA Cup': { category: 1, tournament: 'FA Cup' },
  'Espanha - LALIGA EA SPORTS': { category: 32, tournament: 'LaLiga' },
  'Espanha - Copa del Rey': { category: 32, tournament: 'Copa del Rey' },
  'Alemanha - Bundesliga': { category: 30, tournament: 'Bundesliga' },
  'Itália - Serie A': { category: 31, tournament: 'Serie A' },
  'França - Ligue 1': { category: 7, tournament: 'Ligue 1' },
  'Holanda - Eredivisie': { category: 35, tournament: 'Eredivisie' },
  'Portugal - Liga Portugal': { category: 44, tournament: 'Liga Portugal' },
  'Brasil - Campeonato Brasileiro Série A': { category: 13, tournament: 'Brasileirão Betano' },
  'Brasil - Copa do Brasil': { category: 13, tournament: 'Copa do Brasil' },
  'Argentina - Liga Profesional de Fútbol': { category: 48, tournament: 'Liga Profesional' },
  'México - Liga MX': { category: 12, tournament: 'Liga MX' },
  'Uruguai - Campeonato Uruguayo': { category: 57, tournament: 'Primera División' },
  'EUA - Major League Soccer (MLS)': { category: 26, tournament: 'MLS' },
  'Escócia - Scottish Premiership': { category: 22, tournament: 'Premiership' },
  'Bélgica - Jupiler Pro League': { category: 33, tournament: 'Pro League' },
  'Rússia - Russian Premier League': { category: 21, tournament: 'Premier League' },
  'Europa - UEFA Champions League': { category: 1467, tournament: 'Champions League' },
  'Europa - UEFA Europa League': { category: 1467, tournament: 'Europa League' },
  'Europa - UEFA Conference League': { category: 1467, tournament: 'Conference League' },
};

async function searchSportApi(competition: string, date: string): Promise<Fixture[] | null> {
  const map = SPORTAPI_LEAGUE_MAP[competition];
  if (!map) return null;
  if (!RAPIDAPI_KEY) return []; // sem chave = "sem jogos disponíveis"

  const url = `${SPORTAPI_BASE}/api/v1/category/${map.category}/scheduled-events/${date}`;
  const res = await fetch(url, {
    headers: {
      'X-RapidAPI-Key': RAPIDAPI_KEY,
      'X-RapidAPI-Host': 'sportapi7.p.rapidapi.com',
    },
  });
  if (!res.ok) {
    if (res.status === 429) throw new Error('Cota da SportAPI7 esgotada.');
    throw new Error(`SportAPI7 erro ${res.status}.`);
  }
  const json = await res.json();
  const target = map.tournament.toLowerCase();
  return (json?.events ?? [])
    .filter((e: any) => {
      const name = e?.tournament?.uniqueTournament?.name?.toLowerCase() ?? '';
      if (!name.includes(target)) return false;
      const localDate = tsToLocalDate((e?.startTimestamp ?? 0) * 1000);
      return localDate === date;
    })
    .sort((a: any, b: any) => (a.startTimestamp ?? 0) - (b.startTimestamp ?? 0))
    .map((e: any) => ({
      id: Number(e?.id ?? e?.customId ?? 0),
      game: `${e?.homeTeam?.name ?? '?'} x ${e?.awayTeam?.name ?? '?'}`,
      time: tsToLocalTime((e?.startTimestamp ?? 0) * 1000),
      league: e?.tournament?.uniqueTournament?.name ?? '',
    }));
}

// =====================================================================
// ORCHESTRATOR + CACHE
// =====================================================================

const providers: MatchProvider[] = [
  { name: 'ESPN', search: searchEspn },
  { name: 'SportAPI7', search: searchSportApi },
];

// Cache de 1 minuto em memória: evita re-chamar a API ao re-selecionar a mesma combinação.
const matchCache = new Map<string, { ts: number; result: MatchSearchResult }>();
const CACHE_TTL_MS = 60_000;

function cacheKey(competition: string, date: string): string {
  return `${competition}|${date}`;
}

/**
 * Busca jogos de um campeonato em uma data, tentando os providers em ordem.
 * Nunca lança para o consumidor: sempre retorna um MatchSearchResult.
 * ESPN primeiro (gratuito), SportAPI7 como fallback.
 */
export async function fetchMatches(
  competition: string,
  date: string
): Promise<MatchSearchResult> {
  const isStandard = (COMPETITIONS as readonly string[]).includes(competition);
  if (!isStandard) return { status: 'ok', matches: [], source: '-' };

  const key = cacheKey(competition, date);
  const hit = matchCache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.result;

  for (const provider of providers) {
    try {
      const matches = await provider.search(competition, date);
      if (matches === null) continue; // provider não cobre esta liga
      const result: MatchSearchResult = {
        status: 'ok',
        matches,
        source: provider.name,
      };
      matchCache.set(key, { ts: Date.now(), result });
      return result;
    } catch (err) {
      // provider falhou (rede/cota) → tenta o próximo
      console.warn(`[apiFootball] ${provider.name} falhou:`, err);
    }
  }

  const noKey = !RAPIDAPI_KEY;
  const result: MatchSearchResult = {
    status: noKey ? 'no-key' : 'unavailable',
    matches: [],
    source: '-',
  };
  matchCache.set(key, { ts: Date.now(), result });
  return result;
}