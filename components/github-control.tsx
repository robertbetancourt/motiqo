'use client';

import { useEffect, useState } from 'react';
import { ArrowUpRight, GitBranch, Star } from 'lucide-react';

const configured = process.env.NEXT_PUBLIC_GITHUB_REPO?.replace('https://github.com/','').replace(/\.git$/,'').replace(/\/$/,'');
const repository = configured && /^[\w.-]+\/[\w.-]+$/.test(configured) ? configured : 'robertbetancourt/motiqo';

export default function GitHubControl() {
  const [stars,setStars] = useState<number | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    fetch(`https://api.github.com/repos/${repository}`,{signal:controller.signal,headers:{Accept:'application/vnd.github+json'}}).then(async response => {
      if (!response.ok) return;
      const data = await response.json();
      if (typeof data.stargazers_count === 'number') setStars(data.stargazers_count);
    }).catch(() => {});
    return () => controller.abort();
  }, []);
  return <a href={`https://github.com/${repository}`} target="_blank" rel="noreferrer" className="github-link cursor-target" aria-label={`Motiqo on GitHub${stars !== null ? `, ${stars} stars` : ''}`}><GitBranch size={16}/><span>GitHub</span>{stars !== null ? <span className="github-stars"><Star size={11}/>{Intl.NumberFormat('en',{notation:'compact',maximumFractionDigits:1}).format(stars)}</span> : <ArrowUpRight size={12}/>}</a>;
}
