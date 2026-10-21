import AgentSetup from '@/components/agent-setup';
import SiteFrame from '@/components/site-frame';

export const metadata={title:'Skill — Motiqo',description:'Install the Motiqo skill for your coding agent.'};
export default function SkillPage(){return <SiteFrame><AgentSetup kind="skill"/></SiteFrame>;}
