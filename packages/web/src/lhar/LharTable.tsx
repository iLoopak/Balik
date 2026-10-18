import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { lharCanAct, SUIT_NAME_CS, type RoomView } from '@balik/shared';
import { BrandResults } from '../brand/BrandResults';
import { EmoteBubble, ResultReactions, useEmotes } from '../brand/Emotes';
import { brandAudio } from '../brand/audio';
import { CardLayer } from '../table/CardLayer';
import { computeGeometry } from '../table/layout';
import { GameTableTheme } from '../table/GameTableTheme';
import { SuitIcon } from '../cards/SuitIcon';
import { suitColor } from '../cards/skin';
import { useAppearance } from '../themes/preferences';
import { useElementSize } from '../lib/useElementSize';
import { Avatar, AvatarTurnLabel } from '../avatars/Avatar';
import { avatarTurn } from '../avatars/status';
import { useApp } from '../net/store';
import { eveningAction, leaveRoom, rematch, returnToLobby, sendAction } from '../net/client';
import { usePerfLite } from '../table/usePerfLite';
import { placeLhar } from './layout';
import { useLharDirector } from './useLharDirector';
import '../table/table.css';
import './lhar.css';
const INTRO = 'balik.lhar.intro',
  CHALLENGE_HELP = 'balik.lhar.challenge';
const TIPS = [
  [
    'Polož tajné karty',
    'Vyber 1–4 karty z vlastní ruky. Na střed letí rubem nahoru. Nikdo jiný jejich hodnotu neuvidí.',
  ],
  [
    'Prohlaš hodnotu',
    'Hodnota postupuje 7 → 8 → 9 → 10 → J → Q → K → A. Hraje se povinné tvrzení, skutečné karty mohou být jiné.',
  ],
  [
    'Věř, nebo zpochybni',
    'Další hráč buď pokračuje vlastní sadou, nebo řekne LHÁŘ! Odhalí se jen poslední sada. Za lež bere střed její autor, za pravdu vyzyvatel.',
  ],
] as const;
function seen(key: string) {
  try {
    return !!localStorage.getItem(key);
  } catch {
    return false;
  }
}
function remember(key: string) {
  try {
    localStorage.setItem(key, '1');
  } catch {
    /* session only */
  }
}
export function LharTable({ room, reducedMotion }: { room: RoomView<'lhar'>; reducedMotion: boolean }) {
  const [busy, setBusy] = useState(false),
    lite = usePerfLite(busy),
    quiet = reducedMotion || lite;
  const { display, idle } = useLharDirector(room, quiet);
  useEffect(() => setBusy(!idle), [idle]);
  useAppearance((p) => p.deck);
  const [ref, size] = useElementSize<HTMLDivElement>(),
    me = room.you,
    view = display.view,
    truth = room.game!;
  const pending = useApp((s) => s.pending),
    status = useApp((s) => s.status),
    emotes = useEmotes(room.code);
  const canAct = idle && !pending && status === 'open' && lharCanAct(truth, me);
  const [selected, setSelected] = useState<string[]>([]),
    [hovered, setHovered] = useState<string | null>(null);
  const [modal, setModal] = useState<'intro' | 'rules' | 'select' | 'challenge' | null>(() =>
    seen(INTRO) ? null : 'intro',
  );
  const [tip, setTip] = useState(0),
    [challengeId, setChallengeId] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const name = (id: string) => room.players.find((p) => p.id === id)?.name ?? 'Odpojený hráč';
  useEffect(() => {
    if (modal && dialog.current && !dialog.current.open) dialog.current.showModal();
    else if (!modal && dialog.current?.open) dialog.current.close();
  }, [modal]);
  useEffect(() => {
    if (!canAct) {
      setSelected([]);
      setModal((old) => (old === 'select' || old === 'challenge' ? null : old));
    }
  }, [canAct, room.round]);
  useEffect(() => {
    if (truth.phase === 'finished') setModal(null);
  }, [truth.phase]);
  const closeModal = () => {
    if (modal === 'intro') remember(INTRO);
    setModal(null);
  };
  const toggle = (id: string) => {
    if (!canAct || truth.pendingWinnerId) return;
    setSelected((old) =>
      old.includes(id) ? old.filter((c) => c !== id) : old.length < 4 ? [...old, id] : old,
    );
    brandAudio.play('select');
  };
  const submit = () => {
    if (
      canAct &&
      selected.length &&
      selected.every((id) => truth.myHand?.some((c) => c.id === id)) &&
      sendAction({ type: 'lharPlay', cardIds: selected, declaredRank: truth.requiredRank })
    ) {
      setSelected([]);
      setModal(null);
    }
  };
  const challenge = () => {
    if (!canAct || !truth.lastClaim) return;
    if (!seen(CHALLENGE_HELP)) {
      setChallengeId(truth.lastClaim.id);
      setModal('challenge');
    } else sendAction({ type: 'lharChallenge', claimId: truth.lastClaim.id });
  };
  const geo = useMemo(() => {
    const g = computeGeometry(
      size.width || 360,
      size.height || 520,
      view.players.map((p) => p.id),
      me,
      (display.hands[me] ?? []).length,
    );
    return { ...g, discard: { x: g.w / 2, y: g.discard.y } };
  }, [size.width, size.height, view.players, display.hands, me]);
  const selectedSet = new Set(selected),
    playable = new Set(canAct && !truth.pendingWinnerId ? (truth.myHand ?? []).map((c) => c.id) : []);
  const placed = placeLhar(
    display,
    geo,
    me,
    { hovered, selected: null, pendingKey: null, playable, myTurn: canAct },
    selectedSet,
  );
  const claim = view.lastClaim,
    resolution = display.resolution;
  const label =
    view.phase === 'finished'
      ? 'Konec partie'
      : !idle
        ? 'Karty jsou v pohybu…'
        : canAct
          ? 'Jsi na tahu'
          : `${name(view.currentPlayerId)} rozhoduje`;
  const verdict = resolution ? (resolution.truthful ? 'PRAVDA!' : 'LHÁŘ!') : '';
  return (
    <section className="lhar-shell" aria-label="Lhář">
      <div className="lhar-hud">
        <div className="lhar-turn-copy">
          <Avatar player={room.players.find(p => p.id === me) ?? { id: me, name: name(me) }} size={32} turn={avatarTurn(room, me, status === 'open')} danger={(truth.myHand?.length ?? 0) === 1} reduced={quiet} />
          <div>
            <strong role="status">{label}</strong>
            <small>
              {truth.pendingWinnerId
                ? `${name(truth.pendingWinnerId)} čeká na potvrzení výhry.`
                : `Povinná hodnota: ${truth.requiredRank} · vyber 1–4 karty`}
            </small>
          </div>
          <button
            className="lhar-help"
            onClick={() => {
              setTip(0);
              setModal('rules');
            }}
            aria-label="Pravidla Lháře"
          >
            ?
          </button>
        </div>
        <div className="lhar-actions" aria-label="Rozhodnutí o tvrzení">
          {truth.pendingWinnerId ? (
            <button
              className="btn btn-primary"
              disabled={!canAct}
              onClick={() =>
                truth.lastClaim && sendAction({ type: 'lharAccept', claimId: truth.lastClaim.id })
              }
            >
              Věřím · potvrdit výhru
            </button>
          ) : (
            <>
              <button
                className="btn btn-primary"
                disabled={!canAct}
                onClick={() => (selected.length ? submit() : setModal('select'))}
              >
                {selected.length
                  ? `${truth.lastClaim ? 'Věřím · ' : ''}položit ${selected.length}× ${truth.requiredRank}`
                  : truth.lastClaim
                    ? 'Věřím · vybrat karty'
                    : 'Vybrat 1–4 karty'}
              </button>
              {selected.length > 0 && (
                <button className="btn btn-ghost" disabled={!canAct} onClick={() => setModal('select')}>
                  Výběr {selected.length}/4
                </button>
              )}
            </>
          )}
          {truth.lastClaim && (
            <button className="btn lhar-challenge" disabled={!canAct} onClick={challenge}>
              Nevěřím · LHÁŘ!
            </button>
          )}
        </div>
      </div>
      <div
        className="table lhar-table"
        ref={ref}
        data-game="lhar"
        data-idle={idle}
        data-quiet={quiet}
        data-claim={claim?.id ?? 0}
      >
        <GameTableTheme geo={geo} suit={null} reduced={quiet} lite={lite} myTurn={canAct} active={view.phase === 'playing' ? view.currentPlayerId : null}
          stage={{ kind: 'trick', width: geo.cardW * (geo.compact ? .82 : 1) * 1.25, height: geo.cardH * (geo.compact ? .82 : 1) + 16, label: 'HROMÁDKA' }} beat={{ play: claim?.id ?? null }} />
        {view.players
          .filter((p) => p.id !== me)
          .map((p) => {
            const seat = geo.seats[p.id]!;
            const message = emotes.find((m) => m.playerId === p.id);
            return (
              <div
                key={p.id}
                className={`lhar-seat${view.currentPlayerId === p.id ? ' is-current' : ''}`}
                style={{ left: seat.x, top: seat.y + geo.cardH * geo.oppScale * 0.52 + 10 }}
              >
                <Avatar player={room.players.find(r => r.id === p.id) ?? { id: p.id, name: name(p.id) }} size={32} turn={avatarTurn(room, p.id, status === 'open')} danger={p.handCount === 1} reduced={quiet} />
                <span>
                  <b>{name(p.id)}</b><AvatarTurnLabel turn={avatarTurn(room, p.id, status === 'open')} />
                  <small>
                    {(display.hands[p.id] ?? []).length} karet
                    {room.players.find((r) => r.id === p.id)?.connected ? '' : ' · odpojeno'}
                  </small>
                </span>
                {message && <EmoteBubble message={message} author={name(p.id)} />}
              </div>
            );
          })}
        <div className="lhar-claim" style={{ top: geo.discard.y - geo.cardH * 0.67 }} aria-live="polite">
          <span>{claim ? name(claim.playerId) : 'Tajný střed'}</span>
          <strong>{claim ? `Tvrdí: ${claim.count}× ${claim.rank}` : `Začínáme hodnotou ${view.requiredRank}`}</strong>
          <small>{display.pile.length} karet ve středu</small>
        </div>
        <CardLayer
          game="lhar"
          placed={placed}
          geo={geo}
          stamp={display.stamp}
          speed={quiet ? 0.15 : 1}
          reduced={quiet}
          fxFor={(p) => ({
            selected: p.zone === 'mine' && selectedSet.has(p.entity.card?.id ?? ''),
            playable: p.zone === 'mine' && canAct && !truth.pendingWinnerId,
          })}
          hoverKey={hovered}
          interactive={(p) => canAct && !truth.pendingWinnerId && p.zone === 'mine'}
          onHover={setHovered}
          onActivate={(key) => {
            const card = (display.hands[me] ?? []).find((e) => e.key === key)?.card;
            if (card) toggle(card.id);
          }}
        />
        <AnimatePresence>
          {resolution && (
            <motion.div
              className={`lhar-resolution is-${display.beat}${resolution.truthful ? ' is-truth' : ' is-lie'}`}
              key={resolution.claim.id}
              role="status"
              initial={quiet ? false : { opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              style={{ top: geo.discard.y + geo.cardH * 0.58 }}
            >
              <strong>
                {display.beat === 'challenge' ? `${name(resolution.challengerId)} zpochybňuje…` : verdict}
              </strong>
              {display.beat !== 'challenge' && (
                <span>
                  {name(resolution.collectorId)} bere {resolution.pileCount} karet.
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="lhar-hand-label" style={{ top: geo.handTop - 8 }}>
          Tvoje ruka · {(display.hands[me] ?? []).length} karet
          {selected.length ? ` · vybráno ${selected.length}/4` : ''}
        </div>
        {emotes
          .filter((m) => m.playerId === me)
          .map((m) => (
            <div className="lhar-my-emote" key={m.id}>
              <EmoteBubble message={m} author={name(me)} mine />
            </div>
          ))}
        {view.phase === 'finished' && idle && (
          <div className="lhar-results-wrap">
            <div className="win-panel">
              <BrandResults
                room={room}
                winnerId={view.winnerId}
                pending={pending}
                reduced={quiet}
                onRematch={rematch}
                onLobby={returnToLobby}
                onLeave={leaveRoom}
                onChangeGame={() => eveningAction('openVote')}
                onCloseEvening={() => eveningAction('close')}
                reactions={<ResultReactions room={room} messages={emotes} />}
              />
            </div>
          </div>
        )}
      </div>
      <details className="lhar-history">
        <summary>
          Veřejná historie
          {view.lastResolution
            ? ` · poslední spor: ${name(view.lastResolution.collectorId)} bere ${view.lastResolution.pileCount}`
            : ''}
        </summary>
        {view.lastResolution && (
          <p className="lhar-last-reveal">
            <b>
              Tvrzení #{view.lastResolution.claim.id}: {view.lastResolution.truthful ? 'PRAVDA' : 'LHÁŘ'}
            </b>{' '}
            · odhaleno:{' '}
            {view.lastResolution.revealed.map((c) => `${c.rank} ${SUIT_NAME_CS[c.suit]}`).join(', ')} ·{' '}
            {name(view.lastResolution.collectorId)} bere {view.lastResolution.pileCount} karet.
          </p>
        )}
        <ol>
          {view.history.map((h) => (
            <li key={h.id}>
              {name(h.playerId)}: {h.count}× {h.rank}
              <span>
                {
                  {
                    pending: 'Čeká na rozhodnutí',
                    accepted: 'Přijato bez odhalení',
                    truth: 'Pravda',
                    lie: 'Odhalená lež',
                  }[h.outcome]
                }
              </span>
            </li>
          ))}
        </ol>
      </details>
      <dialog
        className="lhar-dialog"
        ref={dialog}
        onCancel={closeModal}
        onClose={() => setModal(null)}
        aria-labelledby="lhar-dialog-title"
      >
        <header>
          <h2 id="lhar-dialog-title">
            {modal === 'select'
              ? `Tvoje tvrzení: ${truth.requiredRank}`
              : modal === 'challenge'
                ? 'Co udělá výzva?'
                : modal === 'intro'
                  ? `${tip + 1}/3 · ${TIPS[tip]![0]}`
                  : 'Pravidla Lháře'}
          </h2>
          <button className="lhar-help" onClick={closeModal} aria-label="Zavřít nápovědu">
            ×
          </button>
        </header>
        {modal === 'select' ? (
          <>
            <p>Vyber 1–4 vlastní karty. Hodnota tvrzení je povinná; karty mohou být jiné.</p>
            <div className="lhar-card-picker" role="group" aria-label="Karty pro tajný tah">
              {(truth.myHand ?? []).map((c) => (
                <button
                  key={c.id}
                  aria-pressed={selectedSet.has(c.id)}
                  aria-label={`${c.rank} ${SUIT_NAME_CS[c.suit]}`}
                  disabled={!selectedSet.has(c.id) && selected.length === 4}
                  onClick={() => toggle(c.id)}
                >
                  <b>{c.rank}</b>
                  <SuitIcon suit={c.suit} style={{ color: suitColor(c.suit) }} />
                </button>
              ))}
            </div>
            <footer>
              <span aria-live="polite">{selected.length}/4 vybráno</span>
              <button className="btn btn-primary" disabled={!canAct || !selected.length} onClick={submit}>
                Položit {selected.length}× {truth.requiredRank} rubem
              </button>
            </footer>
          </>
        ) : modal === 'challenge' ? (
          <>
            <p>
              Odhalí se jen poslední sada. Pokud alespoň jedna karta nesedí, bere celý střed její autor. Pokud
              sedí všechny, bereš střed ty.
            </p>
            <p>Po sporu začíná vítěz sporu stejnou hodnotou jako napadené tvrzení.</p>
            <button
              className="btn lhar-challenge"
              disabled={!canAct || challengeId !== truth.lastClaim?.id}
              onClick={() => {
                if (
                  challengeId === truth.lastClaim?.id &&
                  sendAction({ type: 'lharChallenge', claimId: challengeId! })
                ) {
                  remember(CHALLENGE_HELP);
                  setModal(null);
                }
              }}
            >
              Zpochybnit {truth.lastClaim?.count}× {truth.lastClaim?.rank}
            </button>
          </>
        ) : modal === 'intro' ? (
          <>
            <p>{TIPS[tip]![1]}</p>
            <footer>
              <button className="btn btn-primary" onClick={() => (tip < 2 ? setTip(tip + 1) : closeModal())}>
                {tip < 2 ? 'Dál' : 'Jdeme hrát'}
              </button>
              <button className="btn btn-ghost" onClick={closeModal}>
                Přeskočit
              </button>
            </footer>
          </>
        ) : (
          <>
            <ol>
              {TIPS.map(([title, text]) => (
                <li key={title}>
                  <b>{title}</b>
                  <p>{text}</p>
                </li>
              ))}
            </ol>
            <p>
              Ve třech se rozdává 11/11/10 od začínajícího. Výzvu smí dát jen další hráč před vlastním platným
              tahem. Poslední karta ještě nevyhrává: soupeř ji přijme, nebo zpochybní. Po sporu začíná vítěz
              sporu stejnou hodnotou jako napadené tvrzení. Při odchodu hráče hra končí kontumačně; ve třech
              či čtyřech bez vítěze.
            </p>
          </>
        )}
      </dialog>
    </section>
  );
}
