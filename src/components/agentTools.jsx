import { useEffect, useState } from 'react';
import HitCard, { resolveAttr } from './HitCard';

/**
 * Client-side tool implementations for Agent Studio agents ("displayHitsToUser",
 * "suggestSearchesToUser", ...). The chat widget only ships renderers for the generic
 * search/recommend tools, so anything else the agent calls must be provided here.
 *
 * `ctxRef.current` is kept up to date by App:
 *   { appId, apiKey, indexName, attributes, query, setQuery, getHits }
 */

const objectsCache = new Map();

async function fetchObjects(ctx, objectIDs) {
  const { appId, apiKey, indexName } = ctx;
  const missing = objectIDs.filter((id) => !objectsCache.has(`${indexName}:${id}`));
  if (missing.length) {
    const res = await fetch(`https://${appId}-dsn.algolia.net/1/indexes/*/objects`, {
      method: 'POST',
      headers: {
        'X-Algolia-Application-Id': appId,
        'X-Algolia-API-Key': apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests: missing.map((objectID) => ({ indexName, objectID })) }),
    });
    if (!res.ok) throw new Error(`getObjects failed (${res.status})`);
    const { results } = await res.json();
    results.forEach((hit, i) => {
      if (hit) objectsCache.set(`${indexName}:${missing[i]}`, hit);
    });
  }
  return objectIDs.map((id) => objectsCache.get(`${indexName}:${id}`)).filter(Boolean);
}

function HitsCarousel({ hits, attributes, headline }) {
  return (
    <div className="ais-Carousel">
      {headline && <div className="agent-hits-headline">{headline}</div>}
      <ol className="ais-Carousel-list">
        {hits.map((hit) => (
          <li key={hit.objectID} className="ais-Carousel-item">
            <HitCard hit={hit} attributes={attributes} />
          </li>
        ))}
      </ol>
    </div>
  );
}

export function createAgentTools(ctxRef) {
  function DisplayHits({ message }) {
    const objectIDs = message?.input?.objectIDs;
    const headline = message?.input?.headline;
    const [hits, setHits] = useState(null);
    const [failed, setFailed] = useState(false);
    const key = Array.isArray(objectIDs) ? objectIDs.join('|') : '';

    useEffect(() => {
      if (!key) return undefined;
      let cancelled = false;
      fetchObjects(ctxRef.current, key.split('|'))
        .then((h) => { if (!cancelled) setHits(h); })
        .catch(() => { if (!cancelled) setFailed(true); });
      return () => { cancelled = true; };
    }, [key]);

    if (!key || failed) return null;
    if (!hits) {
      return (
        <div className="ais-Carousel">
          <ol className="ais-Carousel-list">
            {key.split('|').slice(0, 3).map((id) => (
              <li key={id} className="ais-Carousel-item"><div className="agent-hit-skeleton" /></li>
            ))}
          </ol>
        </div>
      );
    }
    return <HitsCarousel hits={hits} attributes={ctxRef.current.attributes} headline={headline} />;
  }

  function SuggestSearches({ message }) {
    const queries = message?.input?.queries ?? [];
    return (
      <div className="agent-chips">
        {queries.map((q) => (
          <button key={q} type="button" className="agent-chip" onClick={() => ctxRef.current.setQuery(q)}>
            {q}
          </button>
        ))}
      </div>
    );
  }

  function TextChoices({ message, addToolResult }) {
    const { headline, textChoices = [] } = message?.input ?? {};
    const chosen = typeof message?.output === 'string' ? message.output : null;
    return (
      <div>
        {headline && <div className="agent-hits-headline">{headline}</div>}
        <div className="agent-chips">
          {textChoices.map((choice) => (
            <button
              key={choice}
              type="button"
              className={`agent-chip${chosen === choice ? ' agent-chip--selected' : ''}`}
              disabled={chosen !== null}
              onClick={() => addToolResult({ output: choice })}
            >
              {choice}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // addToolResult is queued behind the in-flight stream, so its promise must not be
  // returned here: the stream waits on onToolCall, which would wait on the stream.
  const respond = (compute) => ({
    onToolCall: ({ input, addToolResult }) => {
      addToolResult({ output: compute(input ?? {}) });
    },
  });

  return {
    displayHitsToUser: {
      layoutComponent: DisplayHits,
      ...respond((input) => ({ displayed: input.objectIDs?.length ?? 0 })),
    },
    suggestSearchesToUser: {
      layoutComponent: SuggestSearches,
      ...respond((input) => ({ shown: input.queries?.length ?? 0 })),
    },
    // Output is the user's selection, so no automatic response here.
    displayTextChoicesToUser: { layoutComponent: TextChoices },
    retrieveSearchUiParams: respond(() => ({
      query: ctxRef.current.query,
      availableFacets: [],
      appliedFilters: [],
    })),
    retrieveSearchUiHits: respond(() => ({
      hits: ctxRef.current.getHits().slice(0, 9).map((hit) => ({
        objectID: hit.objectID,
        title: resolveAttr(hit, ctxRef.current.attributes.nameAttr).value ?? null,
      })),
    })),
    updateSearchUiParams: respond((input) => {
      if (typeof input.query === 'string') ctxRef.current.setQuery(input.query);
      return {
        success: true,
        query: input.query ?? ctxRef.current.query,
        note: 'Facet refinements are not supported in this UI; only the query was applied.',
      };
    }),
    displayRecommendationsToUser: respond(() => ({
      error: 'Recommendations are not available in this demo. Use search instead.',
    })),
    algolia_grouped_results: {},
  };
}

/**
 * The chat library never applies `tool-output-error` chunks to the tool part, leaving it
 * stuck in "input-available". That blocks the automatic follow-up request after client-side
 * tools finish, so the reply never arrives. Rewrite those chunks into a normal tool output
 * carrying the error text so the model can still react to it.
 */
function fixToolErrorStream(body) {
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = '';
  const rewrite = (event) => event.replace(/^data: (\{.*\})$/m, (line, json) => {
    try {
      const chunk = JSON.parse(json);
      if (chunk.type === 'tool-output-error') {
        return `data: ${JSON.stringify({
          type: 'tool-output-available',
          toolCallId: chunk.toolCallId,
          output: { error: chunk.errorText },
        })}`;
      }
    } catch { /* not JSON, pass through */ }
    return line;
  });
  return body.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const events = buffer.split('\n\n');
      buffer = events.pop();
      events.forEach((e) => controller.enqueue(encoder.encode(`${rewrite(e)}\n\n`)));
    },
    flush(controller) {
      if (buffer) controller.enqueue(encoder.encode(rewrite(buffer)));
    },
  }));
}

export function createAgentTransport({ appId, apiKey, agentId }) {
  const api = `https://${appId}.algolia.net/agent-studio/1/agents/${agentId}/completions?compatibilityMode=ai-sdk-5`;
  return {
    api,
    headers: {
      'x-algolia-application-id': appId,
      'x-algolia-api-Key': apiKey,
    },
    fetch: async (input, init) => {
      const res = await fetch(input, init);
      if (!res.ok || !res.body) return res;
      return new Response(fixToolErrorStream(res.body), {
        status: res.status,
        statusText: res.statusText,
        headers: res.headers,
      });
    },
    prepareSendMessagesRequest: ({ messages, trigger, ...rest }) => ({
      api: trigger === 'regenerate-message' ? `${api}&cache=false` : api,
      body: { ...rest, messages },
    }),
  };
}
