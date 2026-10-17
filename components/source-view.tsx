import { Highlight } from 'prism-react-renderer';

export default function SourceView({ code, filename = 'component.tsx' }: { code: string; filename?: string }) {
  const language = /\.(svg|html|xml)$/i.test(filename) ? 'markup'
    : /\.css$/i.test(filename) ? 'css'
    : /\.json$/i.test(filename) ? 'json'
    : /\.jsx$/i.test(filename) ? 'jsx'
    : /\.(js|mjs|cjs)$/i.test(filename) ? 'javascript'
    : /\.ts$/i.test(filename) ? 'typescript' : 'tsx';
  return <div className="source-scroll source-wrapped" aria-label="Source code">
    <Highlight code={code} language={language} theme={{ plain: {}, styles: [] }}>
      {({ tokens }) => <pre className="source-content"><code className={`language-${language}`}>
        {tokens.map((line, index) => <span className="source-line" key={index}>
          <span className="source-line-number" aria-hidden="true" data-line={index + 1}/>
          <span className="source-line-text">{line.map((token, tokenIndex) =>
            <span className={['token', ...token.types].join(' ')} key={tokenIndex}>{token.empty ? '' : token.content}</span>
          )}{index < tokens.length - 1 ? '\n' : ''}</span>
        </span>)}
      </code></pre>}
    </Highlight>
  </div>;
}
