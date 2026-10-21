import AgentSetup from '@/components/agent-setup';
import SiteFrame from '@/components/site-frame';

export const metadata={title:'MCP — Motiqo',description:'Connect your agent to the Motiqo component catalog through MCP.'};
export default function MCPPage(){return <SiteFrame><AgentSetup kind="mcp"/></SiteFrame>;}
