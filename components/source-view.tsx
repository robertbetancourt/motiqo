import { useMemo, type ReactNode } from 'react';

// Render tokens as text nodes, never HTML. The clipboard always uses raw source.
const syntax = /(\/\*[\s\S]*?\*\/|\/\/[^\n]*|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b(?:import|from|export|default|const|let|function|return|if|else|for|while|type|interface|new|true|false|null|undefined|async|await|useEffect|useRef|useState)\b|\b\d+(?:\.\d+)?\b)/g;

export default function SourceView({ code }: { code: string }) {
  const tokens = useMemo(() => {
    const result: ReactNode[] = [];
    let cursor = 0;
    for (const match of code.matchAll(syntax)) {
      if (match.index > cursor) result.push(code.slice(cursor, match.index));
      const token = match[0];
      const kind = token.startsWith('//') || token.startsWith('/*') ? 'comment'
        : /^["'`]/.test(token) ? 'string' : /^\d/.test(token) ? 'number' : 'keyword';
      result.push(<span className={`source-${kind}`} key={match.index}>{token}</span>);
      cursor = match.index + token.length;
    }
    result.push(code.slice(cursor));
    return result;
  }, [code]);
  return <div className="source-scroll" aria-label="Source code">
    <div className="source-gutter" aria-hidden="true">{code.split('\n').map((_, index) => <span key={index}>{index + 1}</span>)}</div>
    <pre className="source-content"><code>{tokens}</code></pre>
  </div>;
}
