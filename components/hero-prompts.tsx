'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent } from 'react';
import { ArrowLeft, ArrowRight, Bookmark, Check, ChevronDown, ChevronLeft, ChevronRight, Command, Copy, Download, Monitor, Play, Search, SlidersHorizontal, Smartphone, Sparkles, Tablet } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { filterHeroes, findHero, heroes, type HeroEntry, type HeroId } from '@/lib/heroes';
import HeroStage from './heroes/hero-stage';
import SiteFrame from './site-frame';
import OutlineField from './outline-field';
import ChoiceSelect, { workflowOptions } from './choice-select';
import type { AITool } from '@/lib/catalog';
import styles from './hero-prompts.module.css';

type Viewport = 'desktop' | 'tablet' | 'mobile';

function CopyButton({ hero }: { hero: HeroEntry }) {
  const [message, setMessage] = useState('');
  const tooltip = useId();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const request = useRef(0);

  useEffect(() => () => {
    request.current++;
    if (timer.current) clearTimeout(timer.current);
  }, []);

  async function copy() {
    const token = ++request.current;
    let feedback = 'Copied';
    try {
      await navigator.clipboard.writeText(hero.prompt);
    } catch {
      feedback = 'Clipboard unavailable. Open Prompt to select the text.';
    }
    if (token !== request.current) return;
    setMessage(feedback);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(''), 2200);
  }

  return (
    <div className={styles.copyWrap}>
      <button
        className={styles.copy}
        aria-label={`Copy ${hero.title} prompt`}
        aria-describedby={message ? tooltip : undefined}
        onClick={() => void copy()}
        onKeyDown={e => {
          if (e.key === 'Escape') setMessage('');
        }}
      >
        {message === 'Copied' ? <Check size={14} /> : <Copy size={14} />}
        <span>Copy prompt</span>
      </button>
      {message && (
        <span id={tooltip} role="tooltip" className={styles.tooltip}>
          {message}
        </span>
      )}
      <span role="status" className="sr-only">
        {message}
      </span>
    </div>
  );
}

function LivePreview({ hero }: { hero: HeroEntry }) {
  const host = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function receive(event: MessageEvent) {
      if (
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === 'motiqo:hero-ready' &&
        event.data?.id === hero.id
      ) {
        setReady(true);
      }
    }
    window.addEventListener('message', receive);
    return () => window.removeEventListener('message', receive);
  }, [hero.id]);

  useLayoutEffect(() => {
    const node = host.current!;
    const observer = new ResizeObserver(() => setScale(node.clientWidth / 1280));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={host} className={styles.live} data-ready={ready} aria-hidden="true">
      {scale > 0 && (
        <iframe
          ref={frame}
          title={`${hero.title} animated preview`}
          src={`/hero/preview/${hero.id}`}
          tabIndex={-1}
          loading="lazy"
          style={{ width: 1280, height: 900, transform: `scale(${scale})` }}
        />
      )}
    </div>
  );
}

function HeroFitWrapper({ id, paused }: { id: HeroId; paused: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const BASE_HEIGHT = 780;

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => {
      const h = el.clientHeight;
      if (h <= 0) return;
      setScale(Math.min(1, h / BASE_HEIGHT));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: scale < 1 ? `${(1 / scale) * 100}%` : '100%',
          height: scale < 1 ? BASE_HEIGHT : '100%',
          minHeight: BASE_HEIGHT,
          transform: scale < 1 ? `scale(${scale})` : undefined,
          transformOrigin: 'center center',
          flexShrink: 0,
        }}
      >
        <HeroStage id={id} paused={paused} />
      </div>
    </div>
  );
}

export default function HeroPrompts({
  initialHero,
  initialView = 'preview',
}: {
  initialHero?: string;
  initialView?: 'preview' | 'prompt';
}) {
  const params = useSearchParams();
  const heroParam = params.get('hero');
  const viewParam = params.get('view');

  const [selected, setSelected] = useState<HeroEntry | undefined>(() => findHero(initialHero));
  const [view, setView] = useState<'preview' | 'prompt'>(initialView);
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState('');
  const [saved, setSaved] = useState<string[]>([]);
  const [preview, setPreview] = useState<HeroId | null>(null);
  const [viewport, setViewport] = useState<Viewport>('desktop');
  const [tool, setTool] = useState<AITool>('Universal');
  const [toast, setToast] = useState('');
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prefersReduced = useReducedMotion();
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const reduced = hydrated && !!prefersReduced;
  const still = !!reduced;

  const search = useRef<HTMLInputElement>(null);
  const scroll = useRef(0);
  const last = useRef<HeroId | null>(null);

  const onCardPointerMove = (e: React.PointerEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty('--bezel-x', `${((e.clientX - r.left) / r.width) * 100}%`);
    e.currentTarget.style.setProperty('--bezel-y', `${((e.clientY - r.top) / r.height) * 100}%`);
    e.currentTarget.style.setProperty('--bezel-strength', '1');
  };
  const onCardPointerLeave = (e: React.PointerEvent<HTMLElement>) => {
    e.currentTarget.style.setProperty('--bezel-strength', '0');
  };

  useEffect(() => {
    const syncSaved = () => {
      try {
        const stored: unknown = JSON.parse(localStorage.getItem('motiqo-saved') || '[]');
        if (Array.isArray(stored)) setSaved(stored.filter((id): id is string => typeof id === 'string'));
      } catch {}
    };
    syncSaved();
    try {
      const preferred = localStorage.getItem('motiqo-prompt-tool');
      if (preferred) setTool(preferred as AITool);
    } catch {}
    window.addEventListener('motiqo-saved-change', syncSaved);
    window.addEventListener('storage', syncSaved);
    return () => {
      window.removeEventListener('motiqo-saved-change', syncSaved);
      window.removeEventListener('storage', syncSaved);
    };
  }, []);

  function toggleSave(id: string) {
    const currentStored = (() => {
      try {
        const s: unknown = JSON.parse(localStorage.getItem('motiqo-saved') || '[]');
        return Array.isArray(s) ? s.filter((x): x is string => typeof x === 'string') : [];
      } catch {
        return [];
      }
    })();
    const next = currentStored.includes(id) ? currentStored.filter(v => v !== id) : [...currentStored, id];
    setSaved(next);
    try {
      localStorage.setItem('motiqo-saved', JSON.stringify(next));
      window.dispatchEvent(new Event('motiqo-saved-change'));
    } catch {}
  }

  function notify(msg: string) {
    setToast(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 3000);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      notify('Copied. Make something good.');
      return true;
    } catch {
      notify('Clipboard unavailable.');
      return false;
    }
  }

  useEffect(() => {
    setSelected(findHero(heroParam));
    setView(viewParam === 'prompt' ? 'prompt' : 'preview');
    setPreview(null);
  }, [heroParam, viewParam]);

  useEffect(() => {
    function sync() {
      const url = new URL(window.location.href);
      setSelected(findHero(url.searchParams.get('hero')));
      setView(url.searchParams.get('view') === 'prompt' ? 'prompt' : 'preview');
      setPreview(null);
    }
    function shortcut(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !selected) {
        e.preventDefault();
        search.current?.focus();
      }
    }
    window.addEventListener('popstate', sync);
    window.addEventListener('keydown', shortcut);
    return () => {
      window.removeEventListener('popstate', sync);
      window.removeEventListener('keydown', shortcut);
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [selected]);

  useLayoutEffect(() => {
    if (!selected && last.current) {
      window.scrollTo({ top: scroll.current, behavior: 'instant' });
      document.querySelector<HTMLAnchorElement>(`[data-hero="${last.current}"] .card-title`)?.focus({ preventScroll: true });
    }
  }, [selected]);

  function open(hero: HeroEntry, nextView: 'preview' | 'prompt' = 'preview') {
    scroll.current = window.scrollY;
    last.current = hero.id;
    setSelected(hero);
    setView(nextView);
    setPreview(null);
    const url = new URL(window.location.href);
    url.searchParams.set('hero', hero.id);
    if (nextView === 'prompt') url.searchParams.set('view', 'prompt');
    else url.searchParams.delete('view');
    window.history.pushState({ motiqoHero: true }, '', url);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }

  function close() {
    if (window.history.state?.motiqoHero) {
      window.history.back();
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete('hero');
    url.searchParams.delete('view');
    window.history.replaceState({}, '', url);
    setSelected(undefined);
  }

  function changeView(next: 'preview' | 'prompt') {
    setView(next);
    const url = new URL(window.location.href);
    if (next === 'prompt') url.searchParams.set('view', 'prompt');
    else url.searchParams.delete('view');
    window.history.replaceState(window.history.state, '', url);
  }

  function navigate(offset: number) {
    if (!selected) return;
    const currentIndex = heroes.findIndex(h => h.id === selected.id);
    const nextHero = heroes[(currentIndex + offset + heroes.length) % heroes.length];
    open(nextHero, view);
  }

  function follow(e: MouseEvent<HTMLAnchorElement>, hero: HeroEntry) {
    if (e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    open(hero);
  }

  const filtered = filterHeroes(query, tag);
  const selectedIndex = selected ? heroes.findIndex(h => h.id === selected.id) : 0;

  return (
    <SiteFrame workspace={!!selected} paused={still} savedCount={saved.length}>
      {selected ? (
        <section className="element-workbench" data-paused={still || undefined} aria-labelledby="detail-title">
          <div className="workbench-toolbar">
            <button className="workbench-back" onClick={close}>
              <ArrowLeft size={16} /> Hero
            </button>
          </div>
          <div className="workbench-layout">
            <div className="workbench-canvas">
              <div className="workbench-stage" data-viewport={viewport}>
                <div id="detail-panel" className="detail-workspace" role="tabpanel" aria-labelledby={`hero-${view}-tab`} tabIndex={0}>
                  <div className="workbench-preview" hidden={view !== 'preview'}>
                    <HeroFitWrapper id={selected.id} paused={still} />
                  </div>
                  {view === 'prompt' && (
                    <div key="prompt" className="document-surface panel-enter prompt-surface">
                      <div className="document-toolbar">
                        <span className="document-label">Prompt</span>
                        <ChoiceSelect
                          label="AI tool"
                          options={workflowOptions}
                          value={tool}
                          onChange={value => {
                            setTool(value as AITool);
                            try {
                              localStorage.setItem('motiqo-prompt-tool', value);
                            } catch {}
                          }}
                          paused={still}
                        />
                      </div>
                      <div className="prompt-document" aria-label="Prompt text">
                        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', font: '13px/1.85 var(--sans)', color: 'var(--muted)' }}>
                          {selected.prompt}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="workbench-bottom-bar">
                <div className="workbench-pagination" aria-label="Browse heroes">
                  <button className="icon-button" aria-label="Previous hero" onClick={() => navigate(-1)}>
                    <ChevronLeft size={16} />
                  </button>
                  <span>
                    {String(selectedIndex + 1).padStart(2, '0')}{' '}
                    <span>/ {String(heroes.length).padStart(2, '0')}</span>
                  </span>
                  <button className="icon-button" aria-label="Next hero" onClick={() => navigate(1)}>
                    <ChevronRight size={16} />
                  </button>
                </div>
                <div className="workbench-viewport" role="group" aria-label="Preview viewport">
                  {(['mobile', 'tablet', 'desktop'] as const).map(size => (
                    <button
                      key={size}
                      aria-label={`${size} preview`}
                      aria-pressed={viewport === size}
                      onClick={() => setViewport(size)}
                    >
                      {size === 'desktop' ? <Monitor size={16} /> : size === 'tablet' ? <Tablet size={16} /> : <Smartphone size={16} />}
                    </button>
                  ))}
                </div>
                <div className="workbench-actions">
                  <button
                    className={`save-button ${saved.includes(selected.id) ? 'is-saved' : ''}`}
                    aria-label={`${saved.includes(selected.id) ? 'Unsave' : 'Save'} ${selected.title}`}
                    aria-pressed={saved.includes(selected.id)}
                    onClick={() => toggleSave(selected.id)}
                  >
                    <Bookmark size={16} fill={saved.includes(selected.id) ? 'currentColor' : 'none'} />
                  </button>
                  <CopyButton key={selected.id} hero={selected} />
                </div>
              </div>
            </div>
            <aside className="workbench-inspector" aria-label="Hero details">
              <div className="workbench-inspector-scroll">
                <header className="workbench-heading">
                  <h1 id="detail-title" tabIndex={-1}>
                    {selected.title}
                  </h1>
                  <div className="tags">
                    {selected.tags.map(t => (
                      <button
                        type="button"
                        key={t}
                        className="tag-filter-button"
                        aria-label={`Filter by ${t}`}
                        onClick={() => {
                          setTag(t);
                          close();
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </header>
                <div
                  className="detail-tabs"
                  data-tabs="2"
                  role="tablist"
                  aria-label="Hero views"
                  style={{ '--segment-index': view === 'preview' ? 0 : 1 } as CSSProperties}
                  onKeyDown={event => {
                    if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) return;
                    event.preventDefault();
                    const next = event.key === 'Home' || event.key === 'ArrowLeft' ? 'preview' : 'prompt';
                    changeView(next);
                    document.getElementById(`hero-${next}-tab`)?.focus();
                  }}
                >
                  <span className="segment-thumb" aria-hidden="true" />
                  <button
                    role="tab"
                    id="hero-preview-tab"
                    aria-selected={view === 'preview'}
                    aria-controls="detail-panel"
                    tabIndex={view === 'preview' ? 0 : -1}
                    className={view === 'preview' ? 'active' : ''}
                    onClick={() => changeView('preview')}
                  >
                    <Play size={13} /> Preview
                  </button>
                  <button
                    role="tab"
                    id="hero-prompt-tab"
                    aria-selected={view === 'prompt'}
                    aria-controls="detail-panel"
                    tabIndex={view === 'prompt' ? 0 : -1}
                    className={view === 'prompt' ? 'active' : ''}
                    onClick={() => changeView('prompt')}
                  >
                    <Sparkles size={13} /> Prompt
                  </button>
                </div>
                <details id="hero-details" className="inspector-customization" open>
                  <summary className="inspector-settings-summary">
                    <SlidersHorizontal size={14} />
                    <span>Specifications</span>
                    <ChevronDown size={16} />
                  </summary>
                  <div className="inspector-group inspector-controls" aria-label="Hero specifications">
                    <div className="parameter-select">
                      <span>Category</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>Hero section</span>
                    </div>
                    <div className="parameter-select">
                      <span>Composition</span>
                      <span style={{ fontSize: 11, color: 'var(--muted)' }}>Full-bleed responsive</span>
                    </div>
                    <div className="parameter-select">
                      <span>AI Target</span>
                      <ChoiceSelect
                        label="Target tool"
                        options={workflowOptions}
                        value={tool}
                        onChange={value => {
                          setTool(value as AITool);
                          try {
                            localStorage.setItem('motiqo-prompt-tool', value);
                          } catch {}
                        }}
                        paused={still}
                      />
                    </div>
                  </div>
                </details>
                <div className="inspector-delivery">
                  <button onClick={() => void copy(selected.prompt)}>
                    <Copy size={14} /> Copy prompt
                  </button>
                  <a href={`/heroes/${selected.id}-prompt.txt`} download>
                    <Download size={14} /> Download prompt
                  </a>
                </div>
                <div className="inspector-group inspector-dependencies">
                  <span className="document-label">Technologies</span>
                  <div className="tags">
                    {selected.tags.map(t => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </section>
      ) : (
        <div className={styles.page}>
          <header className="collection-header">
            <div>
              <h1>Heroes<span aria-hidden="true">.</span></h1>
              <p>Full-viewport centerpiece sections with live physics and depth.</p>
            </div>
          </header>
          <section id="hero-collection" className="collection" aria-label="Hero collection">
            <div className="filter-row collection-toolbar">
              <span className="collection-label">Hero</span>
              <div className="search-tools">
                <OutlineField className="search-frame" paused={still}>
                  <label className="search">
                    <Search size={15} />
                    <span className="sr-only">Search heroes</span>
                    <input
                      ref={search}
                      placeholder="Find something"
                      value={query}
                      onChange={e => setQuery(e.target.value)}
                    />
                    <kbd>
                      <Command size={10} /> K
                    </kbd>
                  </label>
                </OutlineField>
              </div>
            </div>

            {tag && (
              <div className="active-tag-filter" role="status">
                <span>Tagged</span>
                <button type="button" aria-label={`Clear ${tag} filter`} onClick={() => setTag('')}>
                  {tag} <span aria-hidden="true">×</span>
                </button>
                <span>
                  {filtered.length} {filtered.length === 1 ? 'hero' : 'heroes'}
                </span>
              </div>
            )}

            <div className="element-grid">
              {filtered.map(hero => (
                <article
                  key={hero.id}
                  data-hero={hero.id}
                  className="element-card"
                  onPointerMove={onCardPointerMove}
                  onPointerEnter={() => setPreview(hero.id)}
                  onPointerLeave={e => {
                    onCardPointerLeave(e);
                    if (!e.currentTarget.contains(document.activeElement)) setPreview(null);
                  }}
                  onFocus={() => setPreview(hero.id)}
                  onBlur={e => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setPreview(null);
                  }}
                  onClick={e => {
                    const target = e.target as HTMLElement;
                    if (!target.closest('button,a,input,select,textarea') && !window.getSelection()?.toString() && e.detail < 2) {
                      open(hero);
                    }
                  }}
                >
                  <span className="motiqo-bezel-light" aria-hidden="true" />
                  <div className={`card-stage ${styles.stage}`}>
                    <img className={styles.poster} src={hero.poster} alt="" width={1280} height={900} loading="eager" />
                    {preview === hero.id && !reduced && <LivePreview hero={hero} />}
                    <a
                      className="card-preview-open"
                      href={`/hero?hero=${hero.id}`}
                      aria-label={`Preview ${hero.title}`}
                      onClick={e => follow(e, hero)}
                    />
                    <button
                      className={`save-button preview-save ${saved.includes(hero.id) ? 'is-saved' : ''}`}
                      aria-label={`${saved.includes(hero.id) ? 'Unsave' : 'Save'} ${hero.title}`}
                      aria-pressed={saved.includes(hero.id)}
                      onClick={e => {
                        e.stopPropagation();
                        toggleSave(hero.id);
                      }}
                    >
                      <Bookmark size={16} fill={saved.includes(hero.id) ? 'currentColor' : 'none'} />
                    </button>
                  </div>
                  <div className="card-info">
                    <div className="card-title-row">
                      <a className="card-title" href={`/hero?hero=${hero.id}`} onClick={e => follow(e, hero)}>
                        <h2>{hero.title}</h2>
                      </a>
                      <span className="category-label">Hero</span>
                    </div>
                    <div className="tags">
                      {hero.tags.map(value => (
                        <button
                          key={value}
                          type="button"
                          className="tag-filter-button"
                          aria-pressed={tag === value}
                          aria-label={`Filter by ${value}`}
                          onClick={() => setTag(tag === value ? '' : value)}
                        >
                          {value}
                        </button>
                      ))}
                    </div>
                    <div className="sr-only">
                      <CopyButton hero={hero} />
                    </div>
                  </div>
                </article>
              ))}
            </div>

            {!filtered.length && (
              <div className="empty-results">
                <SlidersHorizontal size={24} />
                <h2>Nothing here. Yet.</h2>
                <p>Try another search or explore all heroes.</p>
                <button
                  className="secondary-button"
                  onClick={() => {
                    setQuery('');
                    setTag('');
                  }}
                >
                  Show all heroes <ArrowRight size={15} />
                </button>
              </div>
            )}
          </section>
        </div>
      )}
      <div className={`toast ${toast ? 'visible' : ''}`} role="status" aria-live="polite">
        <Check size={16} />
        {toast}
      </div>
    </SiteFrame>
  );
}
