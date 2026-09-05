"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Check, Copy, Radio, ArrowRight, CircleAlert } from "lucide-react";

/**
 * The guided install, modelled on Mixpanel's Set Up Guide: numbered
 * steps, and — the part that actually matters — a live check that says
 * whether the script is working instead of leaving you to paste a tag
 * and hope.
 *
 * Before this, adding a site ended on "copiez ce script" and a link to
 * the dashboard. If nothing showed up afterwards there was no way to
 * tell a broken install from a site nobody had visited yet.
 */

const POLL_MS = 4000;
/** Stop polling after 10 min: a tab left open overnight shouldn't keep
 *  hitting the API, and by then the answer is "something's wrong". */
const POLL_TIMEOUT_MS = 10 * 60_000;

type Status = "waiting" | "received" | "timeout";

export function SetupGuide({
  siteId,
  domain,
  origin,
  onDataReceived,
}: {
  siteId: string;
  domain: string;
  /** Passed in rather than read from window so the snippet is identical
   *  server-side and after hydration. */
  origin: string;
  /** Fired once, when the first event lands. Lets a surrounding list
   *  update its own "en attente / reçues" badge instead of contradicting
   *  the guide right above it. */
  onDataReceived?: (lastEventAt: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState<Status>("waiting");
  const [lastEventAt, setLastEventAt] = useState<string | null>(null);

  const snippet = `<script defer src="${origin}/t.js" data-site="${siteId}"></script>`;

  // Held in a ref so an inline arrow from the caller doesn't restart
  // the polling loop on every parent render.
  const onDataReceivedRef = useRef(onDataReceived);
  useEffect(() => {
    onDataReceivedRef.current = onDataReceived;
  }, [onDataReceived]);

  useEffect(() => {
    let stopped = false;
    const startedAt = Date.now();

    async function check() {
      if (stopped) return;
      try {
        const res = await fetch(`/api/sites/status?site_id=${siteId}`);
        if (res.ok) {
          const data = await res.json();
          const site = data.sites?.[0];
          if (site?.last_event_at) {
            if (!stopped) {
              setLastEventAt(site.last_event_at);
              setStatus("received");
              onDataReceivedRef.current?.(site.last_event_at);
            }
            return; // Found it — stop polling.
          }
        }
      } catch {
        // A failed poll is not a failed install; just try again.
      }
      if (stopped) return;
      if (Date.now() - startedAt > POLL_TIMEOUT_MS) {
        setStatus("timeout");
        return;
      }
      setTimeout(check, POLL_MS);
    }

    check();
    return () => {
      stopped = true;
    };
  }, [siteId]);

  async function copy() {
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-4">
      <Step
        n={1}
        title="Copiez le script"
        done
        body={
          <>
            <p className="text-[13px] text-muted">
              Une seule ligne, à coller dans le{" "}
              <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono text-[12px]">
                &lt;head&gt;
              </code>{" "}
              de <strong>{domain}</strong>. Aucun cookie, aucun bandeau de
              consentement à ajouter.
            </p>
            <div className="relative mt-3 rounded-md border border-border bg-surface-sunken p-3">
              <code className="block break-all pr-20 font-mono text-[12px] leading-relaxed text-primary">
                {snippet}
              </code>
              <button
                onClick={copy}
                className="absolute right-2 top-2 flex items-center gap-1.5 rounded-[var(--app-radius-sm)] border border-border bg-surface px-2.5 py-1 text-[12px] font-medium transition-colors hover:bg-surface-hover"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Copié
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copier
                  </>
                )}
              </button>
            </div>
          </>
        }
      />

      <Step
        n={2}
        title="Collez-le dans vos pages"
        done={status === "received"}
        body={
          <p className="text-[13px] text-muted">
            Sur un site classique, dans le template partagé par toutes les pages.
            Sur Webflow, Shopify ou WordPress, dans le champ « code
            personnalisé&nbsp;/&nbsp;head » des paramètres du thème. Publiez, puis
            ouvrez une page du site.
          </p>
        }
      />

      <Step
        n={3}
        title="On vérifie que ça remonte"
        done={status === "received"}
        body={<LiveCheck status={status} lastEventAt={lastEventAt} domain={domain} />}
      />
    </div>
  );
}

function Step({
  n,
  title,
  body,
  done,
}: {
  n: number;
  title: string;
  body: React.ReactNode;
  done?: boolean;
}) {
  return (
    <div className="app-card">
      <div className="flex items-start gap-3">
        <span
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
            done
              ? "bg-emerald-500 text-white"
              : "bg-primary-pale text-primary"
          }`}
        >
          {done ? <Check className="h-3 w-3" /> : n}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-[13.5px] font-semibold">{title}</h3>
          <div className="mt-1.5">{body}</div>
        </div>
      </div>
    </div>
  );
}

function LiveCheck({
  status,
  lastEventAt,
  domain,
}: {
  status: Status;
  lastEventAt: string | null;
  domain: string;
}) {
  if (status === "received") {
    return (
      <div className="rounded-md border border-emerald-500/30 bg-emerald-500/5 p-3">
        <p className="flex items-center gap-2 text-[13px] font-medium text-emerald-600">
          <Check className="h-4 w-4" />
          Données reçues — le script fonctionne
        </p>
        {/* last_event_at, not the first one — on a site that has been
            running a while this is the most recent visit. */}
        {lastEventAt && (
          <p className="mt-1 pl-6 text-[12px] text-muted">
            Dernière visite enregistrée le{" "}
            {new Date(lastEventAt).toLocaleString("fr-FR", {
              day: "numeric",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            })}
            .
          </p>
        )}
        <Link
          href="/dashboard"
          className="mt-3 ml-6 inline-flex items-center gap-1.5 rounded-[var(--app-radius-sm)] bg-primary px-3 py-1.5 text-[13px] font-medium text-white transition-colors hover:bg-primary-hover"
        >
          Voir mes statistiques
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    );
  }

  if (status === "timeout") {
    return (
      <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
        <p className="flex items-center gap-2 text-[13px] font-medium text-amber-600">
          <CircleAlert className="h-4 w-4" />
          Toujours rien reçu
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-10 text-[12px] leading-relaxed text-muted">
          <li>
            Le script est-il bien publié en ligne sur {domain} ? Un aperçu local
            ou une prévisualisation non publiée ne compte pas.
          </li>
          <li>
            Ouvrez une page du site, faites un clic droit → « Code source », et
            cherchez <code className="font-mono">t.js</code>.
          </li>
          <li>
            Un bloqueur de publicité sur votre propre navigateur peut masquer
            votre visite : testez en navigation privée ou depuis un téléphone.
          </li>
        </ul>
        <button
          onClick={() => window.location.reload()}
          className="mt-3 ml-6 rounded-[var(--app-radius-sm)] border border-border px-3 py-1.5 text-[13px] font-medium transition-colors hover:bg-surface-hover"
        >
          Relancer la vérification
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-border bg-surface-sunken p-3">
      <p className="flex items-center gap-2 text-[13px] font-medium">
        <Radio className="h-4 w-4 animate-pulse text-primary" />
        En écoute des données…
      </p>
      <p className="mt-1 pl-6 text-[12px] leading-relaxed text-muted">
        Cette page se met à jour toute seule dès la première visite sur{" "}
        {domain}. Vous pouvez la laisser ouverte — ou ouvrir votre site dans un
        autre onglet pour déclencher la première.
      </p>
    </div>
  );
}
