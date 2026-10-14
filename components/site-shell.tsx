'use client';
import { createContext, useContext, useMemo, useState, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import SiteSidebar, { type SidebarProps } from './site-sidebar';
const NavigationContext = createContext<Dispatch<SetStateAction<SidebarProps>>>(() => { });
export const useSiteNavigation = () => useContext(NavigationContext);
/** Lives in the root layout: page transitions never remount navigation or its tools. */
export default function SiteShell({ children }: {
    children: ReactNode;
}) {
    const [navigation, setNavigation] = useState<SidebarProps>({});
    const value = useMemo(() => setNavigation, []);
    return <NavigationContext.Provider value={value}><SiteSidebar {...navigation}/>{children}</NavigationContext.Provider>;
}
