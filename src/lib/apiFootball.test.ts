import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchMatches } from './apiFootball';

// Uma liga coberta pela ESPN. Datas variam por teste para driblar o cache de módulo.
const LEAGUE = 'Brasil - Campeonato Brasileiro Série A';

function espnEvent(id = 1, home = 'Flamengo', away = 'Palmeiras', iso = '2026-09-08T20:00:00.000Z') {
  return {
    id: String(id),
    name: `${home} ${away}`,
    competitions: [{ date: iso, competitors: [{ team: { displayName: home } }, { team: { displayName: away } }] }],
    league: { name: 'Campeonato Brasileiro Série A' },
  };
}

/** ISO para uma data/hora iguais do fuso BR. */
function brIso(date: string, hhmm = '17:00'): string {
  return `${date}T${hhmm}:00.000Z`; // ~14h a menos: mantém no mesmo dia BR para horários diurnos
}

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body } as Response;
}

beforeEach(() => {
  vi.restoreAllMocks();
  vi.stubGlobal('fetch', vi.fn());
});

describe('fetchMatches', () => {
  it('retorna vazio para campeonato não padrão', async () => {
    const res = await fetchMatches('Alguma Liga Customizada', '2026-09-13');
    expect(res).toEqual({ status: 'ok', matches: [], source: '-' });
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it('busca jogos via ESPN para liga coberta', async () => {
    const date = '2026-09-08';
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ events: [espnEvent(1, 'Flamengo', 'Palmeiras', brIso(date))] }));
    const res = await fetchMatches(LEAGUE, date);
    expect(res.status).toBe('ok');
    expect(res.source).toBe('ESPN');
    expect(res.matches).toHaveLength(1);
    expect(res.matches[0]).toMatchObject({
      id: 1,
      game: 'Flamengo x Palmeiras',
      league: 'Campeonato Brasileiro Série A',
    });
    expect(res.matches[0].time).toMatch(/^\d{2}:\d{2}$/);
    const called = vi.mocked(fetch).mock.calls.map((c) => String(c[0]));
    expect(called.some((u) => u.includes('site.api.espn.com') && u.includes('soccer/bra.1'))).toBe(true);
  });

  it('deduplica eventos por id', async () => {
    const date = '2026-09-10';
    const e = espnEvent(1, 'A', 'B', brIso(date));
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ events: [e, e, espnEvent(2, 'B', 'C', brIso(date))] }));
    const res = await fetchMatches(LEAGUE, date);
    expect(res.matches.map((m) => m.id).sort()).toEqual([1, 2]);
  });

  it('filtra jogos fora da data local', async () => {
    const date = '2026-09-11';
    vi.mocked(fetch).mockResolvedValue(
      jsonResponse({
        events: [
          espnEvent(1, 'A', 'B', '2026-09-12T20:00:00.000Z'), // cai em 12/09 BR → fora
          espnEvent(2, 'B', 'C', brIso(date)), // em 11/09 BR → dentro
        ],
      }),
    );
    const res = await fetchMatches(LEAGUE, date);
    expect(res.matches.map((m) => m.id)).toEqual([2]);
  });

  it('retorna source ESPN e lista vazia quando a liga não tem jogos', async () => {
    const date = '2026-09-15';
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ events: [] }));
    const res = await fetchMatches(LEAGUE, date);
    expect(res.status).toBe('ok');
    expect(res.source).toBe('ESPN');
    expect(res.matches).toEqual([]);
  });

  it('usa cache em memória: segunda chamada não refaz o fetch', async () => {
    const date = '2026-09-20';
    vi.mocked(fetch).mockResolvedValue(jsonResponse({ events: [espnEvent(1, 'A', 'B', brIso(date))] }));
    const r1 = await fetchMatches(LEAGUE, date);
    expect(r1.source).toBe('ESPN');
    const callsAfterFirst = vi.mocked(fetch).mock.calls.length;
    const r2 = await fetchMatches(LEAGUE, date);
    expect(r2.source).toBe('ESPN');
    expect(r2.matches).toHaveLength(1);
    expect(vi.mocked(fetch).mock.calls.length).toBe(callsAfterFirst); // cache hit
  });

  it('alterna p/ fonte vazia quando ESPN falha e não há chave SportAPI', async () => {
    vi.mocked(fetch).mockRejectedValue(new Error('network down'));
    const res = await fetchMatches('Inglaterra - Premier League', '2026-09-21');
    // sem chave de API no ambiente de teste → SportAPI sem cota retorna lista vazia
    expect(['ok', 'no-key', 'unavailable']).toContain(res.status);
    expect(res.matches).toEqual([]);
  });
});